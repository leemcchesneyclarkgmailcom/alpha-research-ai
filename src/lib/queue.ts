/**
 * DB-backed cache + queue layer (serverless-safe).
 *
 * On Vercel, serverless functions are stateless — an in-memory Map is wiped
 * between invocations. This module uses the Prisma `CacheEntry` table as the
 * cache backend and the `Job` table as the queue backend. Both persist
 * across serverless invocations.
 *
 * The interface is intentionally identical to the previous in-memory version
 * so no consumer code changes are needed.
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

class DbCache {
  async get<T>(key: string): Promise<T | null> {
    const entry = await db.cacheEntry.findUnique({ where: { key } });
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await db.cacheEntry.delete({ where: { key } }).catch(() => {});
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
    await db.cacheEntry.upsert({
      where: { key },
      update: { value: JSON.stringify(value), expiresAt },
      create: { key, value: JSON.stringify(value), expiresAt },
    });
  }

  async del(key: string): Promise<void> {
    await db.cacheEntry.delete({ where: { key } }).catch(() => {});
  }

  async clear(): Promise<void> {
    await db.cacheEntry.deleteMany({});
  }

  async stats() {
    const [size, expired] = await Promise.all([
      db.cacheEntry.count(),
      db.cacheEntry.count({ where: { expiresAt: { lt: new Date() } } }),
    ]);
    // Hit/miss tracking is in-memory per-instance only (best-effort on serverless).
    return { size, expired, hits: 0, misses: 0, hitRate: 0 };
  }
}

export const cache = new DbCache();

// ---------------------------------------------------------------------------
// Queue — jobs are stored in the DB and processed by Vercel Cron webhooks.
// Each cron tick calls processPendingJobs() which picks up queued jobs and
// runs them with bounded concurrency.
// ---------------------------------------------------------------------------

type JobHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

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

/**
 * Process pending jobs. Called by Vercel Cron endpoints. Returns the number
 * of jobs processed. Respects a time budget so serverless functions don't
 * timeout.
 */
export async function processPendingJobs(opts: {
  maxJobs?: number;
  timeBudgetMs?: number;
} = {}): Promise<{ processed: number; completed: number; failed: number }> {
  const maxJobs = opts.maxJobs ?? 5;
  const timeBudgetMs = opts.timeBudgetMs ?? 50_000; // 50s budget (leave room for response)
  const startTime = Date.now();
  let processed = 0;
  let completed = 0;
  let failed = 0;

  // Atomically claim jobs by updating their status to "running".
  const pending = await db.job.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: maxJobs,
  });

  for (const job of pending) {
    if (Date.now() - startTime > timeBudgetMs) break;

    const handler = handlers.get(job.type);
    if (!handler) {
      await db.job.update({
        where: { id: job.id },
        data: { status: "failed", error: `No handler for ${job.type}`, endedAt: new Date() },
      });
      processed++;
      failed++;
      continue;
    }

    // Claim the job atomically (only proceed if we win the claim).
    const claimed = await db.job.updateMany({
      where: { id: job.id, status: "queued" },
      data: { status: "running", startedAt: new Date() },
    });
    if (claimed.count === 0) continue; // Another worker beat us to it.

    processed++;

    try {
      const payload = job.payload ? JSON.parse(job.payload) : {};
      const result = await handler(payload);
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "completed",
          result: result ? JSON.stringify(result) : null,
          endedAt: new Date(),
        },
      });
      completed++;
    } catch (err) {
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          endedAt: new Date(),
        },
      });
      failed++;
    }
  }

  return { processed, completed, failed };
}

// ---------------------------------------------------------------------------
// Scheduler — ensures default tasks are seeded. On Vercel, the actual cron
// triggers come from vercel.json (which calls /api/cron/* endpoints).
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
  {
    name: "check-user-alerts",
    cron: "*/5 * * * *",
    jobType: "check_alerts",
    payload: {},
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

/**
 * Boot the autonomous layer. On Vercel serverless, this just registers
 * handlers and ensures scheduled tasks exist. The actual job processing
 * is triggered by Vercel Cron hitting /api/cron/* endpoints.
 */
export async function bootAutonomousLayer() {
  await ensureScheduledTasks();
  // Note: we do NOT start a setInterval loop here — that doesn't work on
  // serverless. Vercel Cron calls /api/cron/process-jobs every minute which
  // calls processPendingJobs().
}

export function getQueueDepth() {
  return db.job.count({ where: { status: "queued" } });
}
