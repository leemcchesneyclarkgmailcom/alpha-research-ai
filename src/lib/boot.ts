/**
 * Job handlers + boot logic. Registers all background job types.
 * On Vercel, these are triggered by Vercel Cron hitting /api/cron/* endpoints.
 */

import { registerJobHandler, processPendingJobs, ensureScheduledTasks } from "@/lib/queue";
import { collectPrices, collectFilings, collectNews, collectFinancials } from "@/lib/collectors";
import { persistAnalystReport } from "@/lib/ai-engine";
import { db } from "@/lib/db";

let booted = false;

export async function ensureAutonomousBooted() {
  if (booted) return;
  booted = true;

  registerJobHandler("collect_prices", async () => collectPrices({ days: 3 }));
  registerJobHandler("collect_filings", async () => collectFilings());
  registerJobHandler("collect_news", async () => collectNews({ limit: 2 }));
  registerJobHandler("collect_financials", async () => collectFinancials());

  registerJobHandler("generate_rating", async (payload) => {
    const companyId = payload.companyId as string | undefined;
    if (companyId) {
      const r = await persistAnalystReport(companyId);
      return { rated: [`${r.report.rating}`] };
    }
    const companies = await db.company.findMany({ take: 3 });
    const out: string[] = [];
    for (const c of companies) {
      try {
        const r = await persistAnalystReport(c.id);
        out.push(`${c.ticker}: ${r.report.rating}`);
      } catch (e) {
        out.push(`${c.ticker}: error - ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { rated: out };
  });

  registerJobHandler("generate_report", async (payload) => {
    const scope = (payload.scope as string) ?? "watchlist";
    if (scope === "watchlist") {
      const wl = await db.watchlist.findFirst({ include: { items: true } });
      if (wl && wl.items[0]) {
        await persistAnalystReport(wl.items[0].companyId);
        return { report: wl.items[0].companyId };
      }
    }
    const c = await db.company.findFirst();
    if (c) {
      await persistAnalystReport(c.id);
      return { report: c.id };
    }
    return { report: null };
  });

  registerJobHandler("check_alerts", async () => {
    return checkAlerts();
  });

  await ensureScheduledTasks();
}

/**
 * Check all active alerts against current prices + ratings.
 * Triggers any that meet their threshold.
 */
async function checkAlerts() {
  const alerts = await db.alert.findMany({
    where: { active: true, triggeredAt: null },
    include: { company: { include: { prices: { orderBy: { date: "desc" }, take: 1 }, ratings: { orderBy: { generatedAt: "desc" }, take: 1 } } } },
  });

  let triggered = 0;
  for (const alert of alerts) {
    const latestPrice = alert.company.prices[0]?.close;
    const latestRating = alert.company.ratings[0]?.rating;

    let shouldTrigger = false;
    if (alert.type === "price_above" && latestPrice && alert.threshold && latestPrice >= alert.threshold) {
      shouldTrigger = true;
    } else if (alert.type === "price_below" && latestPrice && alert.threshold && latestPrice <= alert.threshold) {
      shouldTrigger = true;
    } else if (alert.type === "rating_change" && latestRating) {
      // Trigger if the rating changed from what it was when the alert was created.
      // Simplified: trigger on any rating that exists (in a real system, we'd compare
      // against the rating at alert-creation time).
      shouldTrigger = true;
    } else if (alert.type === "earnings") {
      const recentEarnings = await db.earningsReport.findFirst({
        where: { companyId: alert.companyId, reportDate: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      });
      if (recentEarnings) shouldTrigger = true;
    }

    if (shouldTrigger) {
      await db.alert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date(), active: false },
      });
      triggered++;
    }
  }

  return { checked: alerts.length, triggered };
}

export { processPendingJobs };
