/**
 * In-memory cache + queue layer.
 *
 * In a production deployment these primitives are backed by Redis. The
 * environment we run in only allows local SQLite + in-process memory, so we
 * expose the same surface (cache.get/set/del, queue.enqueue, scheduler.tick)
 * using Node primitives. All consumers stay portable — swapping the
 * implementations for `ioredis` / `bullmq` requires no code changes upstream.
 */

type CacheEntry<T> = { value: T; expiresAt: number | null };

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private hitCount = 0;
  private missCount = 0;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  stats() {
    return {
      size: this.store.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate:
        this.hitCount + this.missCount === 0
          ? 0
          : this.hitCount / (this.hitCount + this.missCount),
    };
  }
}

export const cache = new MemoryCache();

// ---------------------------------------------------------------------------
// In-process queue. Picks up jobs from SQLite and runs them with bounded
// concurrency. A separate setInterval loop ticks the scheduler.
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";

type JobHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

const MAX_CONCURRENCY = 3;
let running = 0;

export async function enqueue(
  type: string,
  payload: Record<string, unknown> = {},
  userId?: string,
) {
  return db.job.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      status: "queued",
      userId,
    },
  });
}

async function runJob(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.status !== "queued") return;

  const handler = handlers.get(job.type);
  if (!handler) {
    await db.job.update({
      where: { id: jobId },
      data: { status: "failed", error: `No handler for ${job.type}` },
    });
    return;
  }

  await db.job.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const payload = job.payload ? JSON.parse(job.payload) : {};
    const result = await handler(payload);
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        result: result ? JSON.stringify(result) : null,
        endedAt: new Date(),
      },
    });
  } catch (err) {
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        endedAt: new Date(),
      },
    });
  }
}

async function pump() {
  if (running >= MAX_CONCURRENCY) return;
  const pending = await db.job.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: MAX_CONCURRENCY - running,
  });
  for (const job of pending) {
    running++;
    runJob(job.id).finally(() => {
      running--;
    });
  }
}

let interval: NodeJS.Timeout | null = null;

export function startQueueLoop() {
  if (interval) return;
  interval = setInterval(pump, 1500);
  // Don't keep the process alive just for the queue.
  if (interval.unref) interval.unref();
}

// ---------------------------------------------------------------------------
// Scheduler: maintains a registry of cron-style tasks and enqueues jobs when
// they are due. Default tasks are seeded in the database on first boot.
// ---------------------------------------------------------------------------

const SCHEDULE: {
  name: string;
  cron: string;
  jobType: string;
  payload: Record<string, unknown>;
}[] = [
  {
    name: "refresh-market-prices",
    cron: "*/15 * * * *",
    jobType: "collect_prices",
    payload: {},
  },
  {
    name: "ingest-sec-filings",
    cron: "0 * * * *",
    jobType: "collect_filings",
    payload: {},
  },
  {
    name: "monitor-company-news",
    cron: "*/30 * * * *",
    jobType: "collect_news",
    payload: {},
  },
  {
    name: "regenerate-ai-ratings",
    cron: "0 9 * * *",
    jobType: "generate_rating",
    payload: {},
  },
  {
    name: "publish-daily-reports",
    cron: "0 8 * * *",
    jobType: "generate_report",
    payload: { scope: "watchlist" },
  },
];

export async function ensureScheduledTasks() {
  for (const task of SCHEDULE) {
    const existing = await db.scheduledTask.findUnique({ where: { name: task.name } });
    if (!existing) {
      await db.scheduledTask.create({
        data: {
          name: task.name,
          cron: task.cron,
          enabled: true,
          nextRunAt: new Date(),
        },
      });
    }
  }
}

function cronToIntervalMs(cron: string): number {
  // Lightweight parser for the simple expressions we use: every-N-minutes,
  // hourly, daily. Falls back to 60 min if it can't parse.
  const parts = cron.split(" ");
  if (parts[0].startsWith("*/") && parts[1] === "*" && parts[2] === "*") {
    const n = parseInt(parts[0].slice(2), 10);
    return n * 60 * 1000;
  }
  if (parts[0] === "0" && parts[1] === "*" && parts[2] === "*") {
    return 60 * 60 * 1000;
  }
  if (parts[1] === "9" && parts[2] === "*") return 24 * 60 * 60 * 1000;
  if (parts[1] === "8" && parts[2] === "*") return 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

async function tickScheduler() {
  const tasks = await db.scheduledTask.findMany({ where: { enabled: true } });
  const now = new Date();
  for (const task of tasks) {
    if (!task.nextRunAt || task.nextRunAt < now) {
      const def = SCHEDULE.find((s) => s.name === task.name);
      if (def) {
        await enqueue(def.jobType, def.payload);
      }
      const intervalMs = cronToIntervalMs(task.cron);
      const next = new Date(now.getTime() + intervalMs);
      await db.scheduledTask.update({
        where: { id: task.id },
        data: { lastRunAt: now, nextRunAt: next },
      });
    }
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;
let booted = false;

export async function bootAutonomousLayer() {
  if (booted) return;
  booted = true;
  await ensureScheduledTasks();
  startQueueLoop();
  if (!schedulerInterval) {
    schedulerInterval = setInterval(tickScheduler, 30_000);
    if (schedulerInterval.unref) schedulerInterval.unref();
  }
  // Kick an immediate tick so scheduled tasks populate quickly on first boot.
  void tickScheduler();
}

export function getQueueDepth() {
  return db.job.count({ where: { status: "queued" } });
}
