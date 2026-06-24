import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const type = searchParams.get("type"); // analyst | earnings | thesis | risk

  const reports = await db.researchReport.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { company: true },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      rating: r.rating,
      priceTarget: r.priceTarget,
      summary: r.summary,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      company: {
        id: r.company.id,
        ticker: r.company.ticker,
        name: r.company.name,
        sector: r.company.sector,
      },
    })),
  });
}
