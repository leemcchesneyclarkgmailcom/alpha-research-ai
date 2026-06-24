import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prices = await db.stockPrice.findMany({
    where: { companyId: id },
    orderBy: { date: "asc" },
    take: 180,
  });
  return NextResponse.json({
    prices: prices.map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
    })),
  });
}
