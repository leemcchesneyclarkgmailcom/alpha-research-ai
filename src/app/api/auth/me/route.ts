import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: (session.user as { plan?: string }).plan ?? "free",
      role: (session.user as { role?: string }).role,
      creditsUsed: (session.user as { creditsUsed?: number }).creditsUsed,
      creditsLimit: (session.user as { creditsLimit?: number }).creditsLimit,
    },
  });
}
