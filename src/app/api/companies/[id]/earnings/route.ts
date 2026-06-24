import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const earnings = await db.earningsReport.findMany({
    where: { companyId: id },
    orderBy: { reportDate: "desc" },
    take: 8,
  });
  return NextResponse.json({
    earnings: earnings.map((e) => ({
      ...e,
      keyTakeaways: e.keyTakeaways ? JSON.parse(e.keyTakeaways) : [],
      reportDate: e.reportDate.toISOString(),
    })),
  });
}
