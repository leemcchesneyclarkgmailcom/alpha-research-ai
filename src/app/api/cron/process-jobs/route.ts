import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted, processPendingJobs } from "@/lib/boot";

/**
 * Vercel Cron — main queue processor.
 * Called every minute by vercel.json. Picks up queued jobs and processes
 * them with a 50-second time budget (leaves room for the response to return
 * before the serverless function times out).
 *
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` if you
 * set the CRON_SECRET env var. We verify it here to prevent abuse.
 */

export const maxDuration = 60; // Vercel Pro plan max. Adjust for your plan.

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureAutonomousBooted();
  const result = await processPendingJobs({ maxJobs: 5, timeBudgetMs: 50_000 });
  return NextResponse.json({ ok: true, ...result });
}

// Also support POST for manual triggering from the admin panel.
export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, allow in dev mode.
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
