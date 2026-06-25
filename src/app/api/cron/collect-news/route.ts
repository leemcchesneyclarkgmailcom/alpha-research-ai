import { NextRequest, NextResponse } from "next/server";
import { ensureAutonomousBooted } from "@/lib/boot";
import { collectNews } from "@/lib/collectors";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureAutonomousBooted();
  const result = await collectNews({ limit: 2 });
  return NextResponse.json({ ok: true, collected: result });
}

export const POST = GET;

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return authHeader === `Bearer ${secret}`;
}
