import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted } from "@/lib/boot";
import { db } from "@/lib/db";
import { persistAnalystReport } from "@/lib/ai-engine";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureAutonomousBooted();

  // Publish a report for the first watchlist company, or the first company.
  const wl = await db.watchlist.findFirst({ include: { items: true } });
  let companyId: string | null = null;
  if (wl && wl.items[0]) {
    companyId = wl.items[0].companyId;
  } else {
    const c = await db.company.findFirst();
    companyId = c?.id ?? null;
  }

  if (!companyId) return NextResponse.json({ ok: true, report: null });

  try {
    const result = await persistAnalystReport(companyId);
    return NextResponse.json({ ok: true, report: result.report.title });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
