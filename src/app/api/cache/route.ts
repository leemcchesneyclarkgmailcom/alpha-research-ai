import { NextResponse } from "next/server";
import { cache } from "@/lib/queue";

export async function GET() {
  return NextResponse.json(cache.stats());
}

export async function DELETE() {
  await cache.clear();
  return NextResponse.json({ ok: true });
}
