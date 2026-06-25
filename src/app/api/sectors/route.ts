import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/sectors
 * Returns sector-level aggregate performance + company breakdowns.
 */

export async function GET() {
  const companies = await db.company.findMany({
    include: {
      prices: { orderBy: { date: "desc" }, take: 2 },
      ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });

  // Group by sector
  const sectorMap = new Map<string, typeof companies>();
  for (const c of companies) {
    const sector = c.sector ?? "Unknown";
    if (!sectorMap.has(sector)) sectorMap.set(sector, []);
    sectorMap.get(sector)!.push(c);
  }

  const sectors = Array.from(sectorMap.entries()).map(([sector, sectorCompanies]) => {
    let totalMarketCap = 0;
    let totalChange = 0;
    let ratedCount = 0;
    let totalScore = 0;
    let gainers = 0;
    let losers = 0;

    const companyData = sectorCompanies.map((c) => {
      const latest = c.prices[0];
      const prior = c.prices[1];
      const changePct =
        latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;
      totalMarketCap += c.marketCap ?? 0;
      totalChange += changePct;
      if (changePct > 0) gainers++;
      else if (changePct < 0) losers++;
      if (c.ratings[0]) {
        ratedCount++;
        totalScore += c.ratings[0].score;
      }
      return {
        id: c.id,
        ticker: c.ticker,
        name: c.name,
        marketCap: c.marketCap,
        peRatio: c.peRatio,
        price: latest?.close ?? null,
        changePct: Math.round(changePct * 100) / 100,
        rating: c.ratings[0]?.rating ?? null,
        score: c.ratings[0]?.score ?? null,
      };
    });

    return {
      sector,
      companyCount: sectorCompanies.length,
      totalMarketCap,
      avgChangePct: sectorCompanies.length > 0 ? Math.round((totalChange / sectorCompanies.length) * 100) / 100 : 0,
      avgScore: ratedCount > 0 ? Math.round(totalScore / ratedCount) : null,
      gainers,
      losers,
      companies: companyData.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)),
    };
  });

  sectors.sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  return NextResponse.json({ sectors });
}
