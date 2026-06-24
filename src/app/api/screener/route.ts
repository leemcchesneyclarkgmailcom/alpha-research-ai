import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const minMarketCap = parseFloat(searchParams.get("minMarketCap") ?? "0");
  const maxPe = parseFloat(searchParams.get("maxPe") ?? "0");
  const minScore = parseInt(searchParams.get("minScore") ?? "0", 10);
  const rating = searchParams.get("rating"); // strong_buy | buy | hold | sell | strong_sell
  const sort = searchParams.get("sort") ?? "marketCap";
  const order = searchParams.get("order") ?? "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const where: Prisma.CompanyWhereInput = {};
  if (sector) where.sector = sector;
  if (minMarketCap > 0) where.marketCap = { gte: minMarketCap };
  if (maxPe > 0) where.peRatio = { lte: maxPe };
  if (rating) {
    where.ratings = { some: { rating } };
  }

  const companies = await db.company.findMany({
    where,
    include: {
      prices: { orderBy: { date: "desc" }, take: 2 },
      ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
    orderBy:
      sort === "name"
        ? { name: order === "asc" ? "asc" : "desc" }
        : sort === "ticker"
          ? { ticker: order === "asc" ? "asc" : "desc" }
          : sort === "peRatio"
            ? { peRatio: order === "asc" ? "asc" : "desc" }
            : { marketCap: order === "asc" ? "asc" : "desc" },
    take: limit,
  });

  let rows = companies.map((c) => {
    const latest = c.prices[0];
    const prior = c.prices[1];
    const changePct =
      latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;
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
      price: latest?.close ?? null,
      changePct: Math.round(changePct * 100) / 100,
      rating: c.ratings[0]?.rating ?? null,
      score: c.ratings[0]?.score ?? null,
    };
  });

  if (minScore > 0) {
    rows = rows.filter((r) => (r.score ?? 0) >= minScore);
  }

  const sectors = await db.company.findMany({
    distinct: ["sector"],
    select: { sector: true },
  });

  return NextResponse.json({
    rows,
    sectors: sectors.map((s) => s.sector).filter(Boolean),
  });
}
