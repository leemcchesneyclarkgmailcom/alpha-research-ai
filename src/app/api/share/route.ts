import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * POST /api/share
 * Body: { reportId: string }
 * Creates a shareable public link for a research report.
 * Returns: { token, url }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { reportId?: string };
  if (!body.reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const report = await db.researchReport.findUnique({ where: { id: body.reportId } });
  if (!report) return NextResponse.json({ error: "report not found" }, { status: 404 });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  const shared = await db.sharedReport.create({
    data: {
      reportId: report.id,
      token,
      expiresAt,
    },
  });

  return NextResponse.json({
    token: shared.token,
    expiresAt: shared.expiresAt.toISOString(),
  });
}

/**
 * GET /api/share?token=...
 * Returns the public report content (no auth required).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const shared = await db.sharedReport.findUnique({
    where: { token },
    include: { report: { include: { company: true } } },
  });
  if (!shared) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return NextResponse.json({ error: "link expired" }, { status: 410 });
  }

  return NextResponse.json({
    report: {
      ...shared.report,
      createdAt: shared.report.createdAt.toISOString(),
      company: {
        ticker: shared.report.company.ticker,
        name: shared.report.company.name,
        sector: shared.report.company.sector,
      },
    },
  });
}
