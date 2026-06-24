import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ portfolios: [] });

  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    include: {
      holdings: {
        include: {
          company: {
            include: {
              prices: { orderBy: { date: "desc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  const result = portfolios.map((p) => {
    let totalValue = 0;
    let totalCost = 0;
    const holdings = p.holdings.map((h) => {
      const price = h.company.prices[0]?.close ?? h.avgCost;
      const value = price * h.shares;
      const cost = h.avgCost * h.shares;
      totalValue += value;
      totalCost += cost;
      return {
        id: h.id,
        companyId: h.company.id,
        ticker: h.company.ticker,
        name: h.company.name,
        shares: h.shares,
        avgCost: h.avgCost,
        price,
        value: Math.round(value * 100) / 100,
        gain: Math.round((value - cost) * 100) / 100,
        gainPct: Math.round(((value - cost) / cost) * 10000) / 100,
      };
    });
    return {
      id: p.id,
      name: p.name,
      holdings,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round((totalValue - totalCost) * 100) / 100,
      totalGainPct: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 10000) / 100 : 0,
    };
  });

  return NextResponse.json({ portfolios: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    portfolioId?: string;
    ticker?: string;
    shares?: number;
    avgCost?: number;
  };
  if (!body.ticker || !body.shares || !body.avgCost) {
    return NextResponse.json({ error: "ticker, shares, avgCost required" }, { status: 400 });
  }

  let portfolio = body.portfolioId
    ? await db.portfolio.findUnique({ where: { id: body.portfolioId } })
    : await db.portfolio.findFirst({ where: { userId: user.id } });
  if (!portfolio) {
    portfolio = await db.portfolio.create({
      data: { userId: user.id, name: "My Portfolio" },
    });
  }

  const company = await db.company.findUnique({
    where: { ticker: body.ticker.toUpperCase() },
  });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  const holding = await db.portfolioHolding.upsert({
    where: { portfolioId_companyId: { portfolioId: portfolio.id, companyId: company.id } },
    update: {
      shares: { increment: body.shares },
      // weighted-average cost update
      avgCost: body.avgCost, // simplified
    },
    create: {
      portfolioId: portfolio.id,
      companyId: company.id,
      shares: body.shares,
      avgCost: body.avgCost,
    },
  });
  return NextResponse.json({ holding });
}
