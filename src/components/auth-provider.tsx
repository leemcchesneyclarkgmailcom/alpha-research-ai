"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role?: string;
  creditsUsed?: number;
  creditsLimit?: number;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setPlan: (plan: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  );
}

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(true);

  // Mark loading=false once NextAuth has resolved (either authenticated or unauthenticated).
  useEffect(() => {
    if (status !== "loading") {
      const id = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(id);
    }
  }, [status]);

  const user: AuthUser | null = session?.user?.id
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        plan: (session.user as { plan?: string }).plan ?? "free",
        role: (session.user as { role?: string }).role,
        creditsUsed: (session.user as { creditsUsed?: number }).creditsUsed,
        creditsLimit: (session.user as { creditsLimit?: number }).creditsLimit,
      }
    : null;

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
        csrfToken: await getCsrfToken(),
        json: "true",
      }),
      redirect: "manual",
    });
    if (!res.ok && res.status !== 302) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Invalid credentials");
    }
    await update();
  }

  async function register(email: string, password: string, name?: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Registration failed");
    }
    // After registration, sign in automatically
    await login(email, password);
  }

  function logout() {
    void signOut({ redirect: false });
  }

  async function refresh() {
    await update();
  }

  async function setPlan(plan: string) {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      await update();
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, token: null, login, register, logout, refresh, setPlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf");
  const data = await res.json();
  return data.csrfToken;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Convenience hook for authenticated fetch. With NextAuth JWT, the session
 * cookie is automatically sent — no manual Authorization header needed.
 */
export function useAuthFetch() {
  return async (input: string, init?: RequestInit) => {
    return fetch(input, init);
  };
}
