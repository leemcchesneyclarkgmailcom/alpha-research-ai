import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const financials = await db.financialStatement.findMany({
    where: { companyId: id },
    orderBy: { period: "asc" },
  });
  return NextResponse.json({ financials });
}
