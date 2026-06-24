import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const news = await db.newsItem.findMany({
    where: { companyId: id },
    orderBy: { publishedAt: "desc" },
    take: 25,
  });
  return NextResponse.json({
    news: news.map((n) => ({ ...n, publishedAt: n.publishedAt.toISOString() })),
  });
}
