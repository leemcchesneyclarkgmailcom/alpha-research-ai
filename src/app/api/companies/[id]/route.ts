import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await db.company.findUnique({
    where: { id },
    include: {
      ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
      prices: { orderBy: { date: "desc" }, take: 60 },
      earnings: { orderBy: { reportDate: "desc" }, take: 4 },
      filings: { orderBy: { filedAt: "desc" }, take: 8 },
      news: { orderBy: { publishedAt: "desc" }, take: 10 },
      financials: { orderBy: { period: "desc" } },
    },
  });
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const latest = company.prices[0];
  const prior = company.prices[1];
  const changePct =
    latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;

  return NextResponse.json({
    company: {
      ...company,
      prices: company.prices.reverse().map((p) => ({
        date: p.date.toISOString().slice(0, 10),
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume,
      })),
      price: latest?.close ?? null,
      changePct: Math.round(changePct * 100) / 100,
      rating: company.ratings[0] ?? null,
    },
  });
}
