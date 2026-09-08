/**
 * API client for the Smart Pet backend.
 *
 * - same-origin `/api` (nginx proxies to the backend in the compose stack;
 *   Vite dev server proxies too — see vite.config.ts)
 * - access token in memory + localStorage; auto-refresh on 401 once
 * - all breeder endpoints are under /api/breeder/*
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

const STORE = 'smartpet.auth';

export interface Session {
  user: { id: string; email: string; name: string | null; role: 'owner' | 'staff'; kennelId: string | null };
  accessToken: string;
  refreshToken: string;
}

let session: Session | null = load();

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function persist(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s));
    else localStorage.removeItem(STORE);
  } catch {
    /* private mode */
  }
}

export function getSession(): Session | null {
  return session;
}
export function setSession(s: Session | null) {
  persist(s);
}
export function accessToken(): string | null {
  return session?.accessToken ?? null;
}

export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!session?.refreshToken) return false;
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) return false;
        const data = await r.json();
        persist({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; retry?: boolean } = {}
): Promise<T> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && opts.retry !== false && (await doRefresh())) {
    return api<T>(path, { ...opts, retry: false });
  }
  if (res.status === 401) {
    persist(null);
    throw new ApiError(401, 'Session expired');
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const data = await api<Session>('/auth/login', { method: 'POST', body: { email, password }, retry: false });
  const s: Session = { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  persist(s);
  return s;
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST', body: { refreshToken: session?.refreshToken } });
  } catch {
    /* ignore */
  }
  persist(null);
}

/** URL for an EventSource (token in the query string — SSE can't send headers). */
export function streamUrl(): string {
  const t = encodeURIComponent(session?.accessToken ?? '');
  return `${BASE}/breeder/stream?token=${t}`;
}
