import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted, processPendingJobs } from "@/lib/boot";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureAutonomousBooted();

  const alerts = await db.alert.findMany({
    where: { active: true, triggeredAt: null },
    include: {
      company: {
        include: {
          prices: { orderBy: { date: "desc" }, take: 1 },
          ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  let triggered = 0;
  for (const alert of alerts) {
    const latestPrice = alert.company.prices[0]?.close;
    let shouldTrigger = false;

    if (alert.type === "price_above" && latestPrice && alert.threshold && latestPrice >= alert.threshold) {
      shouldTrigger = true;
    } else if (alert.type === "price_below" && latestPrice && alert.threshold && latestPrice <= alert.threshold) {
      shouldTrigger = true;
    } else if (alert.type === "rating_change" && alert.company.ratings[0]) {
      shouldTrigger = true;
    } else if (alert.type === "earnings") {
      const recent = await db.earningsReport.findFirst({
        where: { companyId: alert.companyId, reportDate: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      });
      if (recent) shouldTrigger = true;
    }

    if (shouldTrigger) {
      await db.alert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date(), active: false },
      });
      triggered++;
    }
  }

  return NextResponse.json({ ok: true, checked: alerts.length, triggered });
}

export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
