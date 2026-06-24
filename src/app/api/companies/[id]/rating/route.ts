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
      return NextResponse.json({
        ok: true,
        rating: result.ratingId,
        cached: false,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "AI generation failed" },
        { status: 500 },
      );
    }
  }

  // Async path — enqueue a background job.
  const job = await enqueue("generate_rating", { companyId: id }, user?.id);
  return NextResponse.json({ ok: true, jobId: job.id, status: "queued" });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rating = await db.aIRating.findFirst({
    where: { companyId: id },
    orderBy: { generatedAt: "desc" },
  });
  return NextResponse.json({ rating });
}
