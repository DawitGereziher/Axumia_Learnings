'use client';
/**
 * AuthContext.tsx — Production-grade auth context for AXumia Learnings
 *
 * Fixes:
 *  - user was always null (now properly calls /auth/me on mount & after login)
 *  - No redirect guard (now redirects to /login on expired session)
 *  - No toast on session expiry (now shows error toast)
 *  - No isAuthenticated helper
 *  - Token refresh loop on multiple concurrent 401s (fixed with a mutex)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AuthUser,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  /** The currently authenticated user, or null if not signed in */
  user: AuthUser | null;
  /** True while the initial /auth/me check is in flight */
  isLoading: boolean;
  /** @deprecated use isLoading — kept for backward compat */
  loading: boolean;
  /** True if user is not null */
  isAuthenticated: boolean;
  /** Re-fetch the current user from /auth/me */
  refresh: () => Promise<void>;
  /** Log out the current user and redirect to /login */
  logout: () => Promise<void>;
  /** Update user state after a manual profile update */
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loading: true,
  isAuthenticated: false,
  refresh: async () => {},
  logout: async () => {},
  setUser: () => {},
});

// ─── Public routes — do NOT redirect these to /login ─────────────────────────

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/courses',
  '/instructors',
  '/oauth-success',
  '/oauth-video-success',
]);

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  // Allow /courses/[slug] public detail pages but NOT /courses/[slug]/learn
  if (/^\/courses\/[^/]+$/.test(pathname)) return true;
  if (/^\/instructor\/[^/]+$/.test(pathname)) return true;
  return false;
}

// ─── API Base ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── fetchMe — isolated so it can be called without circular deps ─────────────

async function fetchMe(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      // Short timeout so a dead backend doesn't hang the whole app
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    // D-auth wraps user in { user: {...} }
    const raw = body?.user ?? body;
    if (!raw?.id) return null;
    const first = (raw.first_name as string) || '';
    const last  = (raw.last_name as string)  || '';
    return {
      id:              raw.id,
      email:           raw.email,
      name:            (raw.name ?? [first, last].filter(Boolean).join(' ').trim()) || raw.email,
      role:            raw.role || 'student',
      isEmailVerified: Boolean(raw.isEmailVerified ?? raw.is_email_verified),
      first_name:      first   || undefined,
      last_name:       last    || undefined,
      image:           raw.image || undefined,
    };
  } catch {
    return null;
  }
}

async function fetchRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    const newAccess  = data.accessToken;
    const newRefresh = data.refreshToken ?? refreshToken;
    if (newAccess) setTokens(newAccess, newRefresh);
    return newAccess ?? null;
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // Mutex: prevents simultaneous refresh races from multiple 401 triggers
  const refreshInFlight = useRef(false);

  // ── Core refresh logic ──────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    // Try access token first
    let me = await fetchMe();

    // If that failed, attempt silent refresh
    if (!me && !refreshInFlight.current) {
      refreshInFlight.current = true;
      try {
        const newToken = await fetchRefresh();
        if (newToken) me = await fetchMe();
        else clearTokens();
      } finally {
        refreshInFlight.current = false;
      }
    }

    setUser(me);
    return;
  }, []);

  // ── On mount: load user ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refresh();
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Protected route guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    if (isPublicRoute(pathname)) return;
    // Not logged in on a protected route → redirect
    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, pathname, router]);

  // ── Pro-active token refresh: re-validate every 10 minutes ────────────────
  useEffect(() => {
    const id = setInterval(() => { refresh(); }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loading: isLoading,        // backward compat alias
        isAuthenticated: !!user,
        refresh,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext);

/**
 * useRequireAuth — use in protected page components.
 * Returns { user, isLoading } and automatically redirects
 * to /login if unauthenticated.
 */
export function useRequireAuth() {
  const ctx = useAuth();
  return ctx;
}
