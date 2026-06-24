import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { persistAnalystReport } from "@/lib/ai-engine";
import { enqueue } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const user = await getCurrentUserOrDemo(req);
  const body = await req.json().catch(() => ({})) as { sync?: boolean };

  if (body.sync) {
    try {
      const result = await persistAnalystReport(id, user?.id);
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: { creditsUsed: { increment: 1 } },
        });
      }
      const report = await db.researchReport.findUnique({ where: { id: result.report.id ?? undefined } }).catch(() => null);
      return NextResponse.json({ ok: true, report: report ?? result.report, cached: false });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "AI generation failed" },
        { status: 500 },
      );
    }
  }

  const job = await enqueue("generate_report", { companyId: id }, user?.id);
  return NextResponse.json({ ok: true, jobId: job.id, status: "queued" });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reports = await db.researchReport.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({
    reports: reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
}
