import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { persistAnalystReport } from "@/lib/ai-engine";
import { enqueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  const body = (await req.json().catch(() => ({}))) as {
    companyId?: string;
    ticker?: string;
    sync?: boolean;
  };

  let company = body.companyId
    ? await db.company.findUnique({ where: { id: body.companyId } })
    : body.ticker
      ? await db.company.findUnique({ where: { ticker: body.ticker.toUpperCase() } })
      : null;
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  if (body.sync) {
    try {
      const result = await persistAnalystReport(company.id, user?.id);
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: { creditsUsed: { increment: 1 } },
        });
      }
      return NextResponse.json({ ok: true, report: result.report });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "AI generation failed" },
        { status: 500 },
      );
    }
  }

  const job = await enqueue("generate_report", { companyId: company.id }, user?.id);
  return NextResponse.json({ ok: true, jobId: job.id, status: "queued" });
}
