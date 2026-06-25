import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";

/**
 * GET /api/portfolio/analytics
 * Returns advanced portfolio analytics:
 * - Sharpe ratio (annualized, risk-free rate = 4.5%)
 * - Beta-weighted portfolio exposure
 * - Sector allocation
 * - Diversification score (Herfindahl-Hirschman Index)
 * - Top contributors / detractors
 * - Risk-adjusted return
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ analytics: null });

  const portfolio = await db.portfolio.findFirst({
    where: { userId: user.id },
    include: {
      holdings: {
        include: {
          company: {
            include: {
              prices: { orderBy: { date: "desc" }, take: 60 },
            },
          },
        },
      },
    },
  });

  if (!portfolio || portfolio.holdings.length === 0) {
    return NextResponse.json({ analytics: null });
  }

  // Compute per-holding metrics
  const holdings = portfolio.holdings.map((h) => {
    const prices = h.company.prices.reverse().map((p) => p.close);
    const price = prices[prices.length - 1] ?? h.avgCost;
    const value = price * h.shares;
    const cost = h.avgCost * h.shares;
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

    // Daily returns for Sharpe calculation
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const avgReturn = returns.length > 0 ? returns.reduce((s, n) => s + n, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((s, n) => s + (n - avgReturn) ** 2, 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);

    return {
      id: h.id,
      ticker: h.company.ticker,
      name: h.company.name,
      sector: h.company.sector,
      industry: h.company.industry,
      beta: h.company.beta,
      shares: h.shares,
      avgCost: h.avgCost,
      price,
      value,
      cost,
      gain,
      gainPct,
      weight: 0, // filled below
      avgReturn,
      stdDev,
    };
  });

  // Portfolio totals
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalCost = holdings.reduce((s, h) => s + h.cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Weight each holding
  holdings.forEach((h) => {
    h.weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  });

  // Portfolio beta (weighted average)
  const portfolioBeta = holdings.reduce((s, h) => s + (h.beta ?? 1) * (h.weight / 100), 0);

  // Portfolio daily returns (weighted average of holding returns)
  const portfolioReturns: number[] = [];
  const maxPriceLen = Math.max(...holdings.map((h) => {
    return 0; // We don't have per-day aligned returns here; simplified below
  }));

  // Simplified Sharpe: use average of holding returns weighted by position size
  const weightedAvgReturn = holdings.reduce((s, h) => s + h.avgReturn * (h.weight / 100), 0);
  const weightedVariance = holdings.reduce((s, h) => s + (h.stdDev ** 2) * (h.weight / 100) ** 2, 0);
  const portfolioStdDev = Math.sqrt(weightedVariance + weightedAvgReturn ** 2 - weightedAvgReturn ** 2);

  // Annualized Sharpe (252 trading days, risk-free rate = 4.5% annual)
  const annualReturn = weightedAvgReturn * 252;
  const annualStdDev = portfolioStdDev * Math.sqrt(252);
  const riskFreeRate = 0.045;
  const sharpeRatio = annualStdDev > 0 ? (annualReturn - riskFreeRate) / annualStdDev : 0;

  // Sector allocation
  const sectorAlloc = holdings.reduce<Record<string, number>>((acc, h) => {
    const sector = h.sector ?? "Unknown";
    acc[sector] = (acc[sector] ?? 0) + h.value;
    return acc;
  }, {});
  const sectorAllocation = Object.entries(sectorAlloc).map(([sector, value]) => ({
    sector,
    value: Math.round(value * 100) / 100,
    weight: Math.round((value / totalValue) * 10000) / 100,
  }));

  // Diversification score (HHI — lower = more diversified)
  const hhi = holdings.reduce((s, h) => s + (h.weight / 100) ** 2, 0);
  const diversificationScore = Math.round((1 - hhi) * 100); // 0-100, higher = more diversified

  // Top contributors and detractors
  const sortedByGain = [...holdings].sort((a, b) => b.gain - a.gain);
  const topContributors = sortedByGain.slice(0, 3).map((h) => ({
    ticker: h.ticker,
    gain: Math.round(h.gain * 100) / 100,
    gainPct: Math.round(h.gainPct * 100) / 100,
  }));
  const topDetractors = sortedByGain.slice(-3).reverse().map((h) => ({
    ticker: h.ticker,
    gain: Math.round(h.gain * 100) / 100,
    gainPct: Math.round(h.gainPct * 100) / 100,
  }));

  return NextResponse.json({
    analytics: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      totalGainPct: Math.round(totalGainPct * 100) / 100,
      portfolioBeta: Math.round(portfolioBeta * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      annualizedReturn: Math.round(annualReturn * 10000) / 100,
      annualizedVolatility: Math.round(annualStdDev * 10000) / 100,
      diversificationScore,
      sectorAllocation,
      topContributors,
      topDetractors,
      holdings: holdings.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        value: Math.round(h.value * 100) / 100,
        weight: Math.round(h.weight * 100) / 100,
        gain: Math.round(h.gain * 100) / 100,
        gainPct: Math.round(h.gainPct * 100) / 100,
        beta: h.beta,
      })),
    },
  });
}
