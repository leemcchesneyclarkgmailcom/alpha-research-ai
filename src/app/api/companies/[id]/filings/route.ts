import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const filings = await db.filing.findMany({
    where: { companyId: id },
    orderBy: { filedAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    filings: filings.map((f) => ({
      ...f,
      risks: f.risks ? JSON.parse(f.risks) : [],
      filedAt: f.filedAt.toISOString(),
    })),
  });
}
