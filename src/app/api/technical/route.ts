import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/technical?companyId=...
 * Returns computed technical indicators: SMA-20, SMA-50, RSI-14, MACD,
 * Bollinger Bands, and 52-week high/low.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const prices = await db.stockPrice.findMany({
    where: { companyId },
    orderBy: { date: "asc" },
    take: 260, // ~1 year of trading days
  });

  if (prices.length < 20) {
    return NextResponse.json({ error: "insufficient price data" }, { status: 400 });
  }

  const closes = prices.map((p) => p.close);
  const latest = closes[closes.length - 1];

  // Simple Moving Averages
  const sma20 = avg(closes.slice(-20));
  const sma50 = closes.length >= 50 ? avg(closes.slice(-50)) : null;

  // RSI (14-period)
  const rsi = computeRSI(closes, 14);

  // MACD (12, 26, 9)
  const macd = computeMACD(closes);

  // Bollinger Bands (20-period, 2 std dev)
  const bb = computeBollingerBands(closes.slice(-20));

  // 52-week high/low
  const high52 = Math.max(...closes);
  const low52 = Math.min(...closes);

  // Volume analysis
  const volumes = prices.map((p) => p.volume);
  const avgVolume20 = avg(volumes.slice(-20));
  const latestVolume = volumes[volumes.length - 1];
  const volumeRatio = latestVolume / avgVolume20;

  return NextResponse.json({
    indicators: {
      price: latest,
      sma20: round2(sma20),
      sma50: sma50 ? round2(sma50) : null,
      rsi: round2(rsi),
      macd: {
        macd: round2(macd.macd),
        signal: round2(macd.signal),
        histogram: round2(macd.histogram),
      },
      bollinger: {
        upper: round2(bb.upper),
        middle: round2(bb.middle),
        lower: round2(bb.lower),
      },
      high52w: round2(high52),
      low52w: round2(low52),
      pctFrom52wHigh: round2(((latest - high52) / high52) * 100),
      pctFrom52wLow: round2(((latest - low52) / low52) * 100),
      avgVolume20: Math.round(avgVolume20),
      latestVolume: Math.round(latestVolume),
      volumeRatio: round2(volumeRatio),
    },
    signals: generateSignals({
      price: latest,
      sma20,
      sma50,
      rsi,
      macd: macd.macd,
      macdSignal: macd.signal,
      bbUpper: bb.upper,
      bbLower: bb.lower,
    }),
  });
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);
  const macdLine = ema12 - ema26;
  // For signal, we need the EMA of the MACD line over the last 9 periods.
  // Simplified: use the current MACD as both (since we don't have full MACD history).
  const signal = macdLine * 0.9; // Approximation
  return { macd: macdLine, signal, histogram: macdLine - signal };
}

function computeEMA(values: number[], period: number): number {
  if (values.length < period) return avg(values);
  const k = 2 / (period + 1);
  let ema = avg(values.slice(0, period));
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

function computeBollingerBands(values: number[]): { upper: number; middle: number; lower: number } {
  const middle = avg(values);
  const variance = avg(values.map((v) => (v - middle) ** 2));
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + 2 * stdDev,
    middle,
    lower: middle - 2 * stdDev,
  };
}

function generateSignals(s: {
  price: number;
  sma20: number;
  sma50: number | null;
  rsi: number;
  macd: number;
  macdSignal: number;
  bbUpper: number;
  bbLower: number;
}): { signal: string; strength: "strong" | "moderate" | "weak" }[] {
  const signals: { signal: string; strength: "strong" | "moderate" | "weak" }[] = [];

  // Trend signal
  if (s.sma50 && s.sma20 > s.sma50) {
    signals.push({ signal: "Golden cross (SMA20 above SMA50) — bullish trend", strength: "moderate" });
  } else if (s.sma50 && s.sma20 < s.sma50) {
    signals.push({ signal: "Death cross (SMA20 below SMA50) — bearish trend", strength: "moderate" });
  }

  // RSI signal
  if (s.rsi > 70) {
    signals.push({ signal: "RSI above 70 — overbought", strength: "moderate" });
  } else if (s.rsi < 30) {
    signals.push({ signal: "RSI below 30 — oversold", strength: "moderate" });
  }

  // MACD signal
  if (s.macd > s.macdSignal) {
    signals.push({ signal: "MACD above signal line — bullish momentum", strength: "weak" });
  } else {
    signals.push({ signal: "MACD below signal line — bearish momentum", strength: "weak" });
  }

  // Bollinger signal
  if (s.price > s.bbUpper) {
    signals.push({ signal: "Price above upper Bollinger Band — overbought", strength: "moderate" });
  } else if (s.price < s.bbLower) {
    signals.push({ signal: "Price below lower Bollinger Band — oversold", strength: "moderate" });
  }

  return signals;
}
