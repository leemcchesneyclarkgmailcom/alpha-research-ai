import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  // Build an earnings calendar from existing reports + next 30 days mock.
  const reports = await db.earningsReport.findMany({
    orderBy: { reportDate: "desc" },
    take: 20,
    include: { company: true },
  });

  const calendar = reports.map((r) => ({
    id: r.id,
    ticker: r.company.ticker,
    name: r.company.name,
    period: r.period,
    reportDate: r.reportDate.toISOString().slice(0, 10),
    epsActual: r.epsActual,
    epsExpected: r.epsExpected,
    revenueActual: r.revenueActual,
    surprise: r.surprise,
    guidance: r.guidance,
  }));

  return NextResponse.json({ calendar });
}
