// lib/auth.ts — D-auth token helpers for Next.js client

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (token && !localStorage.getItem('token')) {
    localStorage.setItem('token', token);
  }
  return token;
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('token', access);
  localStorage.setItem('refresh_token', refresh);
}
export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

export interface AuthUser {
  id: string; email: string; name: string; role: string;
  isEmailVerified: boolean; first_name?: string; last_name?: string; image?: string;
}

function normalizeAuthUser(raw: Record<string, unknown>): AuthUser {
  const first = (raw.first_name as string) || '';
  const last = (raw.last_name as string) || '';
  const name =
    (raw.name as string) ||
    [first, last].filter(Boolean).join(' ').trim() ||
    (raw.email as string) ||
    'User';

  return {
    id: raw.id as string,
    email: raw.email as string,
    name,
    role: (raw.role as string) || 'student',
    isEmailVerified: Boolean(raw.isEmailVerified ?? raw.is_email_verified),
    first_name: first || undefined,
    last_name: last || undefined,
    image: (raw.image as string) || undefined,
  };
}

export async function getMe(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const user = (await res.json()).user;
    if (!user) return null;
    return {
      ...user,
      isEmailVerified: user.isEmailVerified ?? user.is_email_verified ?? false,
      name:
  user.name ??
  ([user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email),
    };
  } catch { return null; }
}


export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(payload: {
  email: string; password: string; first_name: string; last_name: string; role?: string;
}) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${API}/auth/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  clearTokens();
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('token', data.accessToken);
    return data.accessToken;
  } catch { return null; }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url.startsWith('http') ? url : `${API}${url}`, { ...options, headers });
}
