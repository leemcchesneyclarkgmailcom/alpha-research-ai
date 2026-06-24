import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  if (!q) return NextResponse.json({ results: [] });
  const companies = await db.company.findMany({
    where: {
      OR: [
        { ticker: { contains: q } },
        { name: { contains: q } },
      ],
    },
    take: 8,
  });
  return NextResponse.json({
    results: companies.map((c) => ({
      id: c.id,
      ticker: c.ticker,
      name: c.name,
      exchange: c.exchange,
    })),
  });
}
