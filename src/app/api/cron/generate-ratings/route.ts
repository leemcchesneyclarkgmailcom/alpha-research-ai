import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted, processPendingJobs } from "@/lib/boot";
import { db } from "@/lib/db";
import { persistAnalystReport } from "@/lib/ai-engine";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureAutonomousBooted();
  const companies = await db.company.findMany({ take: 3, orderBy: { marketCap: "desc" } });
  const results: string[] = [];
  for (const c of companies) {
    try {
      const r = await persistAnalystReport(c.id);
      results.push(`${c.ticker}: ${r.report.rating}`);
    } catch (e) {
      results.push(`${c.ticker}: error`);
    }
  }
  return NextResponse.json({ ok: true, rated: results });
}

export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
