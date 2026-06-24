import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);
  const sentiment = searchParams.get("sentiment");

  const where = sentiment ? { sentiment } : {};
  const news = await db.newsItem.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { company: true },
  });

  return NextResponse.json({
    news: news.map((n) => ({
      id: n.id,
      ticker: n.company.ticker,
      name: n.company.name,
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      url: n.url,
      sentiment: n.sentiment,
      sentimentScore: n.sentimentScore,
      publishedAt: n.publishedAt.toISOString(),
    })),
  });
}
