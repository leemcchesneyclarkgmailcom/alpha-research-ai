import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted } from "@/lib/boot";
import { enqueue } from "@/lib/queue";
import { collectPrices, collectFilings, collectNews } from "@/lib/collectors";

/**
 * Vercel Cron — collect market data every 15 minutes.
 * Also runs the collector inline so the response has useful data.
 */

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureAutonomousBooted();
  const result = await collectPrices({ days: 3 });
  await enqueue("collect_prices", {}, undefined);
  return NextResponse.json({ ok: true, collected: result });
}

export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
