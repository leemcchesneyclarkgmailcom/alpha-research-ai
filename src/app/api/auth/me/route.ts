import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role,
      creditsUsed: user.creditsUsed,
      creditsLimit: user.creditsLimit,
    },
  });
}

export async function DELETE() {
  // Stateless demo: client clears token. Could accept a token to delete.
  return NextResponse.json({ ok: true });
}
