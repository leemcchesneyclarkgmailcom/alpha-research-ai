import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * NextAuth.js configuration — credentials provider with JWT strategy.
 *
 * Why JWT (not database sessions)?
 *   Vercel serverless functions are stateless. JWT tokens travel in the
 *   cookie and are verified on every request without a DB lookup — this
 *   is the recommended strategy for serverless deployments.
 *
 * Why credentials provider?
 *   The user asked for email/password sign-in that works on Vercel.
 *   OAuth providers (Google, GitHub) can be added later by uncommenting
 *   the providers below and adding their env vars.
 */

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
    // To enable GitHub OAuth, uncomment and add GITHUB_ID / GITHUB_SECRET env vars:
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID!,
    //   clientSecret: process.env.GITHUB_SECRET!,
    // }),
    // To enable Google OAuth, uncomment and add GOOGLE_ID / GOOGLE_SECRET:
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_ID!,
    //   clientSecret: process.env.GOOGLE_SECRET!,
    // }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch the latest plan/credits from DB so token stays fresh
        const dbUser = await db.user.findUnique({
          where: { id: user.id! },
          select: { plan: true, role: true, creditsUsed: true, creditsLimit: true },
        });
        if (dbUser) {
          token.plan = dbUser.plan;
          token.role = dbUser.role;
          token.creditsUsed = dbUser.creditsUsed;
          token.creditsLimit = dbUser.creditsLimit;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { plan?: string }).plan = token.plan as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { creditsUsed?: number }).creditsUsed = token.creditsUsed as number;
        (session.user as { creditsLimit?: number }).creditsLimit = token.creditsLimit as number;
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },
};
