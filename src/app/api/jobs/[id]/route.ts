import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    job: {
      ...job,
      payload: job.payload ? JSON.parse(job.payload) : null,
      result: job.result ? JSON.parse(job.result) : null,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      endedAt: job.endedAt?.toISOString() ?? null,
    },
  });
}
