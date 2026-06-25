import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

export interface AppSession extends Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    plan?: string;
    role?: string;
    creditsUsed?: number;
    creditsLimit?: number;
  };
}

/**
 * Resolve the current user from a NextAuth JWT session. Works on Vercel
 * serverless because the JWT is carried in the cookie and verified without
 * any in-memory state.
 */
export async function getCurrentUser(_req?: NextRequest) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUser(req?: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return { user: null, error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

/**
 * For routes that should still work for anonymous demo users. Falls back to
 * the seeded demo account so the dashboard is browsable without sign-in.
 */
export async function getCurrentUserOrDemo(req?: NextRequest) {
  const u = await getCurrentUser(req);
  if (u) return u;
  const demo = await db.user.findUnique({ where: { email: "demo@alpha-research.ai" } });
  if (demo) {
    return {
      id: demo.id,
      email: demo.email,
      name: demo.name,
      plan: demo.plan,
      role: demo.role,
      creditsUsed: demo.creditsUsed,
      creditsLimit: demo.creditsLimit,
    };
  }
  return null;
}
