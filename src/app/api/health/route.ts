import { NextResponse } from "next/server";
import { ensureAutonomousBooted } from "@/lib/boot";
import { cache } from "@/lib/queue";

export async function GET() {
  await ensureAutonomousBooted();
  const stats = await cache.stats();
  return NextResponse.json({
    status: "ok",
    service: "alpha-research-ai",
    version: "2.0.0",
    cache: stats,
    auth: "nextauth-jwt",
    timestamp: new Date().toISOString(),
  });
}
