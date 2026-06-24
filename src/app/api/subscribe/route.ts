import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  if (!["free", "pro", "institutional"].includes(plan ?? ""))
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      plan: plan!,
      creditsLimit: plan === "free" ? 25 : plan === "pro" ? 250 : 10000,
      creditsUsed: 0,
    },
  });
  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      plan: updated.plan,
      creditsUsed: updated.creditsUsed,
      creditsLimit: updated.creditsLimit,
    },
  });
}
