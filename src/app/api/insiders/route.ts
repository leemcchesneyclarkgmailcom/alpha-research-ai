import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/insiders?companyId=...&limit=20
 * Returns insider transactions for a company. If no companyId, returns
 * recent insider transactions across all companies.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  const where = companyId ? { companyId } : {};
  const insiders = await db.insiderTransaction.findMany({
    where,
    orderBy: { filedAt: "desc" },
    take: limit,
    include: { company: true },
  });

  return NextResponse.json({
    insiders: insiders.map((i) => ({
      ...i,
      filedAt: i.filedAt.toISOString(),
      company: {
        id: i.company.id,
        ticker: i.company.ticker,
        name: i.company.name,
      },
    })),
  });
}
