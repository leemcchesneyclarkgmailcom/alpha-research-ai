"use client";

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

const TOKEN_KEY = "alpha-research-token";

// Read the persisted token once at client mount without triggering an
// eslint react-hooks/set-state-in-effect violation. useSyncExternalStore
// returns null on the server and the actual value on the client.
const emptySubscribe = () => () => {};
function getInitialToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // The initial token is read synchronously via useSyncExternalStore so we
  // don't need a setState-in-effect to hydrate it.
  const initialToken = useSyncExternalStore(emptySubscribe, getInitialToken, () => null);
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState<boolean>(!!initialToken);

  const fetchMe = async (t: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetchMe(token).then((u) => {
      if (cancelled) return;
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // When there is no token at all, mark loading complete after first paint.
  useEffect(() => {
    if (!token) {
      const id = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(id);
    }
  }, [token]);

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Login failed");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
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
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    if (!token) return;
    const u = await fetchMe(token);
    if (u) setUser(u);
  }

  async function setPlan(plan: string) {
    if (!token) return;
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, token, login, register, logout, refresh, setPlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Convenience hook for authenticated fetch — auto-attaches Bearer token. */
export function useAuthFetch() {
  const { token } = useAuth();
  return async (input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
}
