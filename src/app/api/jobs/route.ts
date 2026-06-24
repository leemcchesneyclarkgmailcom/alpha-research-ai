import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const jobs = await db.job.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      ...j,
      payload: j.payload ? JSON.parse(j.payload) : null,
      result: j.result ? JSON.parse(j.result) : null,
      createdAt: j.createdAt.toISOString(),
      startedAt: j.startedAt?.toISOString() ?? null,
      endedAt: j.endedAt?.toISOString() ?? null,
    })),
  });
}
