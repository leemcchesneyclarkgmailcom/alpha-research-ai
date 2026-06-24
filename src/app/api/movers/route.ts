import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  const companies = await db.company.findMany({
    include: {
      prices: { orderBy: { date: "desc" }, take: 2 },
    },
  });

  const rows = companies
    .map((c) => {
      const latest = c.prices[0];
      const prior = c.prices[1];
      const changePct =
        latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;
      return {
        id: c.id,
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        price: latest?.close ?? null,
        changePct: Math.round(changePct * 100) / 100,
        volume: latest?.volume ?? null,
      };
    })
    .filter((r) => r.price !== null);

  const gainers = [...rows]
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, limit);
  const losers = [...rows]
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, limit);
  const active = [...rows]
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, limit);

  return NextResponse.json({ gainers, losers, active });
}
