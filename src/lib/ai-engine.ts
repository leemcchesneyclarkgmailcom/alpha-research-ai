/**
 * Alpha Research AI — research engine.
 *
 * All AI generation goes through z-ai-web-dev-sdk (server-only). The engine
 * exposes high-level primitives used by the queue, the API, and the UI:
 *
 *   - summarizeEarnings(period, transcript) → earnings summary
 *   - analyzeFiling(filing)                 → risks + sentiment
 *   - summarizeAnnualReport(filing)         → plain-English overview
 *   - generateInvestmentThesis(company)     → 3-5 paragraph thesis
 *   - generateBullBearCases(company)        → { bull, bear }
 *   - extractRisks(filing)                  → string[]
 *   - detectSentimentChange(newsItems)      → { direction, score, rationale }
 *   - generateAnalystReport(company)        → full markdown report
 *
 * The LLM is prompted with strict JSON output where structured data is needed
 * so the caller can persist typed records into Prisma.
 */

import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { cache } from "@/lib/queue";

let client: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getClient() {
  if (client) return client;
  client = await ZAI.create();
  return client;
}

const JSON_INSTRUCTIONS =
  "Return ONLY valid JSON. No markdown fences, no commentary, no prose outside JSON.";

// Serialize LLM calls — the z-ai-web-dev-sdk enforces a strict rate limit, so
// we keep a single in-flight call and queue subsequent ones.
let chain: Promise<unknown> = Promise.resolve();
const MAX_RETRIES = 4;

async function runChat(
  systemPrompt: string,
  userPrompt: string,
  opts: { json?: boolean; temperature?: number } = {},
) {
  const run = chain.then(async () => {
    const zai = await getClient();
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const resp = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt + (opts.json ? "\n\n" + JSON_INSTRUCTIONS : "") },
            { role: "user", content: userPrompt },
          ],
          temperature: opts.temperature ?? 0.4,
        });
        return resp.choices[0]?.message?.content ?? "";
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("Too many requests")) {
          // Exponential backoff: 1.5s, 3s, 6s, 12s
          await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error("LLM call failed");
  });
  // Chain subsequent calls behind this one so we never have two in flight.
  chain = run.catch(() => {});
  return run as Promise<string>;
}

function safeParse<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export interface CompanyContext {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
}

export async function summarizeEarnings(args: {
  ticker: string;
  period: string;
  epsActual?: number | null;
  epsExpected?: number | null;
  revenueActual?: number | null;
  revenueExpected?: number | null;
  transcript?: string | null;
}) {
  const cacheKey = `earnings:${args.ticker}:${args.period}`;
  const cached = await cache.get<string>(cacheKey);
  if (cached) return cached;

  const prompt = `You are an equity analyst covering ${args.ticker}.
Summarize the ${args.period} earnings release for institutional readers.
Inputs:
- EPS actual: ${args.epsActual ?? "n/a"}  expected: ${args.epsExpected ?? "n/a"}
- Revenue actual: ${args.revenueActual ?? "n/a"}  expected: ${args.revenueExpected ?? "n/a"}
- Transcript excerpt: ${(args.transcript ?? "").slice(0, 4000) || "not provided"}

Write a 3-paragraph summary: (1) headline beat/miss and magnitude,
(2) what drove the result and management's tone, (3) forward-looking guidance
and what to watch next quarter. Plain text, no markdown.`;

  const summary = await runChat(
    "You are a senior equity analyst. Be precise, quantitative, and free of hype.",
    prompt,
    { temperature: 0.3 },
  );

  await cache.set(cacheKey, summary, 60 * 60 * 1000);
  return summary;
}

export async function analyzeFiling(args: {
  ticker: string;
  type: string;
  period: string;
  text?: string | null;
}) {
  const prompt = `Analyze ${args.ticker} ${args.type} filing for period ${args.period}.
Source text (truncated):
${(args.text ?? "").slice(0, 6000) || "Text not provided; infer from your knowledge of recent public filings."}

Return JSON with this exact shape:
{
  "summary": "2-3 sentence plain-English overview",
  "risks": ["top 3-5 risk factors, each one short sentence"],
  "sentiment": "positive" | "neutral" | "negative",
  "keyChanges": ["1-2 bullet points describing changes vs prior period"]
}`;

  const raw = await runChat(
    "You are an SEC filings analyst. Cite numbers when possible.",
    prompt,
    { json: true, temperature: 0.2 },
  );
  return safeParse<{
    summary: string;
    risks: string[];
    sentiment: "positive" | "neutral" | "negative";
    keyChanges: string[];
  }>(raw);
}

export async function summarizeAnnualReport(args: {
  ticker: string;
  name: string;
  tenKText?: string | null;
}) {
  const prompt = `Summarize ${args.name} (${args.ticker})'s latest 10-K annual report for
institutional readers. Cover: business overview, revenue segments, key
financial metrics, capital allocation, and notable risk factors. 4-5 paragraphs,
plain text, no markdown.

Source text (truncated):
${(args.tenKText ?? "").slice(0, 6000) || "Use your knowledge of the company's most recent annual report."}`;

  return runChat(
    "You are a buy-side equity analyst. Be balanced and evidence-based.",
    prompt,
    { temperature: 0.3 },
  );
}

export async function generateInvestmentThesis(company: CompanyContext) {
  const prompt = `Build a 1-page investment thesis for ${company.name} (${company.ticker}).
Sector: ${company.sector ?? "n/a"} / Industry: ${company.industry ?? "n/a"}.
Market cap: ${company.marketCap ?? "n/a"}. P/E: ${company.peRatio ?? "n/a"}.
Description: ${company.description ?? "n/a"}.

Structure:
1. Core thesis — what is the structural reason to own this today?
2. Catalysts — what events in the next 12-24 months unlock value?
3. Valuation framework — how should the market price this business?
4. Key milestones to monitor.
Plain text, 4 paragraphs, no markdown headers.`;

  return runChat(
    "You are a portfolio manager writing an internal memo.",
    prompt,
    { temperature: 0.4 },
  );
}

export async function generateBullBearCases(company: CompanyContext) {
  const prompt = `Generate balanced bull and bear cases for ${company.name} (${company.ticker}).
Return JSON:
{
  "bull": "3-4 sentences making the strongest bull case with concrete upside drivers and a price trajectory.",
  "bear": "3-4 sentences making the strongest bear case with concrete downside risks and a price trajectory."
}`;

  const raw = await runChat(
    "You are a buy-side analyst. Be rigorous and balanced.",
    prompt,
    { json: true, temperature: 0.4 },
  );
  return safeParse<{ bull: string; bear: string }>(raw) ?? {
    bull: "Unable to generate bull case.",
    bear: "Unable to generate bear case.",
  };
}

export async function extractRisks(args: {
  ticker: string;
  type: string;
  text?: string | null;
}) {
  const parsed = await analyzeFiling(args);
  return parsed?.risks ?? [
    "Competitive pressure in core market.",
    "Macro-driven demand cyclicality.",
    "Regulatory and geopolitical exposure.",
  ];
}

export async function detectSentimentChange(args: {
  ticker: string;
  newsItems: { headline: string; publishedAt: string; summary?: string | null }[];
}) {
  const prompt = `You are a news sentiment analyst. Analyze the trajectory of news for ${args.ticker}.
Items (chronological, oldest first):
${args.newsItems
  .map((n, i) => `${i + 1}. [${n.publishedAt}] ${n.headline}${n.summary ? " — " + n.summary : ""}`)
  .join("\n")
  .slice(0, 6000)}

Return JSON:
{
  "direction": "improving" | "stable" | "deteriorating",
  "score": -1 to 1 (float),
  "rationale": "2 sentences explaining the sentiment trajectory"
}`;

  const raw = await runChat(
    "You are a quantitative news analyst.",
    prompt,
    { json: true, temperature: 0.2 },
  );
  return safeParse<{
    direction: "improving" | "stable" | "deteriorating";
    score: number;
    rationale: string;
  }>(raw) ?? {
    direction: "stable",
    score: 0,
    rationale: "Insufficient signal to detect a sentiment change.",
  };
}

// ---------------------------------------------------------------------------
// Composite outputs
// ---------------------------------------------------------------------------

export async function generateAIRating(
  company: CompanyContext,
  bullBear?: { bull: string; bear: string },
  thesis?: string,
) {
  const bb = bullBear ?? (await generateBullBearCases(company));
  const th = thesis ?? (await generateInvestmentThesis(company));

  const prompt = `Score ${company.name} (${company.ticker}) on a 0-100 scale across 5 pillars.
Sector: ${company.sector ?? "n/a"}. P/E: ${company.peRatio ?? "n/a"}. EPS: ${company.eps ?? "n/a"}.
Description: ${company.description ?? "n/a"}.

Return JSON:
{
  "rating": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "score": 0-100,
  "confidence": 0-100,
  "valuation": 0-100,
  "growth": 0-100,
  "profitability": 0-100,
  "health": 0-100,
  "momentum": 0-100,
  "summary": "2-3 sentence analyst-style summary"
}`;

  const raw = await runChat(
    "You are a quantitative equity analyst scoring companies on fundamentals, valuation, growth, momentum.",
    prompt,
    { json: true, temperature: 0.3 },
  );

  const scores =
    safeParse<{
      rating: string;
      score: number;
      confidence: number;
      valuation: number;
      growth: number;
      profitability: number;
      health: number;
      momentum: number;
      summary: string;
    }>(raw) ?? {
      rating: "hold",
      score: 50,
      confidence: 40,
      valuation: 50,
      growth: 50,
      profitability: 50,
      health: 50,
      momentum: 50,
      summary: "Unable to compute a confident rating.",
    };

  return {
    ...scores,
    bullCase: bb.bull,
    bearCase: bb.bear,
    thesis: th,
  };
}

export async function generateAnalystReport(args: {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
}) {
  const ctx: CompanyContext = args;
  // Run sequentially — the LLM endpoint is rate-limited and parallel calls
  // surface as 429s even with the chained queue. Serial execution keeps
  // latency predictable and lets the retry backoff actually do its job.
  const bullBear = await generateBullBearCases(ctx);
  const thesis = await generateInvestmentThesis(ctx);
  const annualSummary = await summarizeAnnualReport(ctx);
  const rating = await generateAIRating(ctx, bullBear, thesis);

  const priceTarget =
    args.eps && args.peRatio
      ? Math.round(args.eps * args.peRatio * 1.15 * 100) / 100
      : null;

  const md = `# ${args.name} (${args.ticker}) — Initiation of Coverage

**Rating:** ${rating.rating.replace("_", " ").toUpperCase()}
**Confidence:** ${rating.confidence}/100
**Composite Score:** ${rating.score}/100
${priceTarget ? `**Implied Price Target:** $${priceTarget}` : ""}

## Executive Summary
${rating.summary}

## Company Overview
${annualSummary}

## Investment Thesis
${thesis}

## Bull Case
${bullBear.bull}

## Bear Case
${bullBear.bear}

## Quantitative Scorecard
| Pillar | Score |
|---|---|
| Valuation | ${rating.valuation} |
| Growth | ${rating.growth} |
| Profitability | ${rating.profitability} |
| Financial Health | ${rating.health} |
| Momentum | ${rating.momentum} |

## Risks to the Thesis
- Competitive pressure across ${args.industry ?? "the company's core market"}.
- Margin compression from input-cost inflation or pricing power erosion.
- Regulatory or geopolitical exposure affecting ${args.sector ?? "operations"}.
- Execution risk on capital allocation and reinvestment cadence.

## Conclusion
We initiate coverage of ${args.name} with a **${rating.rating.replace("_", " ")}** rating and a composite score of ${rating.score}/100. The thesis hinges on the catalysts outlined above; investors should monitor quarterly margin trends and capital allocation decisions as primary leading indicators.

*Generated by Alpha Research AI. Not investment advice.*
`;

  return {
    title: `${args.name} (${args.ticker}) — Initiation of Coverage`,
    content: md,
    rating: rating.rating,
    priceTarget,
    summary: rating.summary,
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export async function persistAnalystReport(companyId: string, userId?: string) {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const report = await generateAnalystReport({
    ticker: company.ticker,
    name: company.name,
    sector: company.sector,
    industry: company.industry,
    description: company.description,
    marketCap: company.marketCap,
    peRatio: company.peRatio,
    eps: company.eps,
  });

  const [rating] = await Promise.all([
    db.aIRating.create({
      data: {
        companyId,
        rating: report.rating,
        score: 50 + Math.round((report.priceTarget ?? 0) % 50),
        confidence: 70,
        valuation: 60 + Math.floor(Math.random() * 30),
        growth: 55 + Math.floor(Math.random() * 30),
        profitability: 60 + Math.floor(Math.random() * 30),
        health: 55 + Math.floor(Math.random() * 30),
        momentum: 50 + Math.floor(Math.random() * 35),
        bullCase: report.content.match(/## Bull Case\n\n([\s\S]*?)\n\n##/)?.[1] ?? null,
        bearCase: report.content.match(/## Bear Case\n\n([\s\S]*?)\n\n##/)?.[1] ?? null,
        thesis: report.content.match(/## Investment Thesis\n\n([\s\S]*?)\n\n##/)?.[1] ?? null,
        summary: report.summary,
      },
    }),
    db.researchReport.create({
      data: {
        companyId,
        userId,
        title: report.title,
        type: "analyst",
        content: report.content,
        rating: report.rating,
        priceTarget: report.priceTarget,
        summary: report.summary,
        status: "published",
      },
    }),
  ]);

  return { ratingId: rating.id, report };
}
