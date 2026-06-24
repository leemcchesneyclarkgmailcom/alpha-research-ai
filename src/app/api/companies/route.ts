import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { ensureAutonomousBooted } from "@/lib/boot";

export async function GET(req: NextRequest) {
  await ensureAutonomousBooted();
  await getCurrentUserOrDemo(req);

  const companies = await db.company.findMany({
    orderBy: { marketCap: "desc" },
    include: {
      prices: { orderBy: { date: "desc" }, take: 1 },
      ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });

  const result = companies.map((c) => {
    const latest = c.prices[0];
    const prior = c.prices[1];
    const changePct =
      latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;
    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      exchange: c.exchange,
      sector: c.sector,
      industry: c.industry,
      marketCap: c.marketCap,
      peRatio: c.peRatio,
      eps: c.eps,
      dividendYield: c.dividendYield,
      beta: c.beta,
      price: latest?.close ?? null,
      changePct: Math.round(changePct * 100) / 100,
      rating: c.ratings[0]?.rating ?? null,
      score: c.ratings[0]?.score ?? null,
    };
  });

  return NextResponse.json({ companies: result });
}
