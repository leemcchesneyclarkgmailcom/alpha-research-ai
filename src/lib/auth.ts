import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureAutonomousBooted } from "@/lib/boot";

/**
 * Lightweight session model. In production, swap for NextAuth + JWT cookies.
 * Here we issue an opaque token stored in the Session table; the client holds
 * it in localStorage and sends it as `Authorization: Bearer <token>`.
 */

const TOKEN_HEADER = "authorization";

export async function getCurrentUser(req: NextRequest) {
  // Boot the autonomous layer on first API hit.
  await ensureAutonomousBooted();

  const header = req.headers.get(TOKEN_HEADER);
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function requireUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/** For routes that should still work for anonymous demo users, fall back to
 *  the seeded demo account so the dashboard is browsable without sign-in. */
export async function getCurrentUserOrDemo(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (u) return u;
  const demo = await db.user.findUnique({ where: { email: "demo@alpha-research.ai" } });
  return demo;
}
