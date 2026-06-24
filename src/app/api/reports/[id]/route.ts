import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await db.researchReport.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    report: {
      ...report,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      company: {
        id: report.company.id,
        ticker: report.company.ticker,
        name: report.company.name,
        sector: report.company.sector,
      },
    },
  });
}
