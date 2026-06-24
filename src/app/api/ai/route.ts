import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";
import {
  generateInvestmentThesis,
  generateBullBearCases,
  extractRisks,
  detectSentimentChange,
  summarizeEarnings,
  analyzeFiling,
  summarizeAnnualReport,
  persistAnalystReport,
} from "@/lib/ai-engine";

async function getCompany(idOrTicker: string) {
  return (
    (await db.company.findUnique({ where: { id: idOrTicker } })) ??
    (await db.company.findUnique({ where: { ticker: idOrTicker.toUpperCase() } }))
  );
}

async function chargeCredits(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { creditsUsed: { increment: 1 } },
    });
  }
  return user;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action: string;
    company?: string;
    period?: string;
    filingType?: string;
    text?: string;
    transcript?: string;
    news?: { headline: string; publishedAt: string; summary?: string | null }[];
  };

  const company = body.company ? await getCompany(body.company) : null;

  try {
    switch (body.action) {
      case "thesis": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const thesis = await generateInvestmentThesis({
          ticker: company.ticker,
          name: company.name,
          sector: company.sector,
          industry: company.industry,
          description: company.description,
          marketCap: company.marketCap,
          peRatio: company.peRatio,
          eps: company.eps,
        });
        await chargeCredits(req);
        return NextResponse.json({ thesis });
      }
      case "bullbear": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const bb = await generateBullBearCases({
          ticker: company.ticker,
          name: company.name,
          sector: company.sector,
          industry: company.industry,
          description: company.description,
          marketCap: company.marketCap,
          peRatio: company.peRatio,
          eps: company.eps,
        });
        await chargeCredits(req);
        return NextResponse.json(bb);
      }
      case "risks": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const risks = await extractRisks({
          ticker: company.ticker,
          type: body.filingType ?? "10-K",
          text: body.text,
        });
        await chargeCredits(req);
        return NextResponse.json({ risks });
      }
      case "sentiment": {
        if (!company || !body.news)
          return NextResponse.json({ error: "company and news required" }, { status: 400 });
        const sentiment = await detectSentimentChange({
          ticker: company.ticker,
          newsItems: body.news,
        });
        await chargeCredits(req);
        return NextResponse.json(sentiment);
      }
      case "earnings-summary": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const summary = await summarizeEarnings({
          ticker: company.ticker,
          period: body.period ?? "Q2-2025",
          transcript: body.transcript,
        });
        await chargeCredits(req);
        return NextResponse.json({ summary });
      }
      case "filing-analysis": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const analysis = await analyzeFiling({
          ticker: company.ticker,
          type: body.filingType ?? "10-K",
          period: body.period ?? "FY2024",
          text: body.text,
        });
        await chargeCredits(req);
        return NextResponse.json(analysis ?? { error: "no parse" });
      }
      case "annual-summary": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const summary = await summarizeAnnualReport({
          ticker: company.ticker,
          name: company.name,
          tenKText: body.text,
        });
        await chargeCredits(req);
        return NextResponse.json({ summary });
      }
      case "analyst-report": {
        if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });
        const result = await persistAnalystReport(company.id);
        await chargeCredits(req);
        return NextResponse.json({ ok: true, report: result.report });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 },
    );
  }
}
