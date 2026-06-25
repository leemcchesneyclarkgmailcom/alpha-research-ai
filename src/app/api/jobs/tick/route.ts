import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAutonomousBooted, processPendingJobs } from "@/lib/boot";
import { collectPrices, collectFilings, collectNews } from "@/lib/collectors";

/**
 * Manual tick endpoint — kicks every scheduled task immediately. Used by the
 * Admin/Jobs panel to demonstrate the autonomous pipeline.
 */
export async function POST() {
  await ensureAutonomousBooted();
  const [prices, filings, news, jobsResult] = await Promise.all([
    collectPrices({ days: 2 }),
    collectFilings(),
    collectNews({ limit: 1 }),
    processPendingJobs({ maxJobs: 10, timeBudgetMs: 45_000 }),
  ]);
  const tasks = await db.scheduledTask.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    results: { prices, filings, news, jobs: jobsResult },
    tasks: tasks.map((t) => ({
      name: t.name,
      cron: t.cron,
      enabled: t.enabled,
      lastRunAt: t.lastRunAt?.toISOString() ?? null,
      nextRunAt: t.nextRunAt?.toISOString() ?? null,
    })),
  });
}

export async function GET() {
  await ensureAutonomousBooted();
  const tasks = await db.scheduledTask.findMany({ orderBy: { name: "asc" } });
  const queued = await db.job.count({ where: { status: "queued" } });
  const running = await db.job.count({ where: { status: "running" } });
  const completed = await db.job.count({ where: { status: "completed" } });
  const failed = await db.job.count({ where: { status: "failed" } });
  return NextResponse.json({
    queued,
    running,
    completed,
    failed,
    tasks: tasks.map((t) => ({
      name: t.name,
      cron: t.cron,
      enabled: t.enabled,
      lastRunAt: t.lastRunAt?.toISOString() ?? null,
      nextRunAt: t.nextRunAt?.toISOString() ?? null,
    })),
  });
}
