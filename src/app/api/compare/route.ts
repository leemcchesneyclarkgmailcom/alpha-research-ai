import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Company Comparison — side-by-side metrics for up to 4 companies.
 *
 * GET /api/compare?ids=id1,id2,id3
 * Returns normalized comparison data.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 4);

  if (ids.length < 2) {
    return NextResponse.json({ error: "Provide at least 2 company IDs via ?ids=" }, { status: 400 });
  }

  const companies = await db.company.findMany({
    where: { id: { in: ids } },
    include: {
      prices: { orderBy: { date: "desc" }, take: 30 },
      ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
      financials: { orderBy: { period: "desc" }, take: 1 },
      earnings: { orderBy: { reportDate: "desc" }, take: 1 },
    },
  });

  const result = companies.map((c) => {
    const latestPrice = c.prices[0];
    const priorPrice = c.prices[1];
    const changePct =
      latestPrice && priorPrice ? ((latestPrice.close - priorPrice.close) / priorPrice.close) * 100 : 0;
    const price30dAgo = c.prices[c.prices.length - 1];
    const change30dPct =
      latestPrice && price30dAgo ? ((latestPrice.close - price30dAgo.close) / price30dAgo.close) * 100 : 0;
    const rating = c.ratings[0];
    const financial = c.financials[0];
    const earnings = c.earnings[0];

    return {
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      industry: c.industry,
      marketCap: c.marketCap,
      peRatio: c.peRatio,
      eps: c.eps,
      dividendYield: c.dividendYield,
      beta: c.beta,
      price: latestPrice?.close ?? null,
      changePct: Math.round(changePct * 100) / 100,
      change30dPct: Math.round(change30dPct * 100) / 100,
      rating: rating?.rating ?? null,
      score: rating?.score ?? null,
      valuation: rating?.valuation ?? null,
      growth: rating?.growth ?? null,
      profitability: rating?.profitability ?? null,
      health: rating?.health ?? null,
      momentum: rating?.momentum ?? null,
      bullCase: rating?.bullCase ?? null,
      bearCase: rating?.bearCase ?? null,
      revenue: financial?.revenue ?? null,
      netIncome: financial?.netIncome ?? null,
      freeCashFlow: financial?.freeCashFlow ?? null,
      epsSurprise: earnings?.surprise ?? null,
      priceHistory: c.prices.reverse().map((p) => ({
        date: p.date.toISOString().slice(0, 10),
        close: p.close,
      })),
    };
  });

  return NextResponse.json({ companies: result });
}
