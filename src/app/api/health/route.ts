import { NextResponse } from "next/server";
import { ensureAutonomousBooted } from "@/lib/boot";
import { cache } from "@/lib/queue";

export async function GET() {
  await ensureAutonomousBooted();
  return NextResponse.json({
    status: "ok",
    service: "alpha-research-ai",
    version: "1.0.0",
    cache: cache.stats(),
    timestamp: new Date().toISOString(),
  });
}
