/**
 * API client for the Smart Pet backend.
 *
 * - same-origin `/api` (nginx proxies to the backend in the compose stack;
 *   Vite dev server proxies too — see vite.config.ts)
 * - access token in memory + localStorage; auto-refresh on 401 once
 * - all breeder endpoints are under /api/breeder/*
 *
 * The JSON transport routes through `@jubasjl76-eng/api-client`
 * (`createSmartPetClient`): bearer auth + jittered retry/backoff on 429/5xx
 * (honours `Retry-After`) + `RateLimitedError`. This module keeps the
 * refresh-on-401, multipart upload, blob download and SSE-URL logic on top —
 * those are not part of the generated client.
 */
import { createSmartPetClient, RateLimitedError } from '@jubasjl76-eng/api-client';

export { RateLimitedError };

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

/** openapi-fetch client with the shared auth + 429/5xx retry middleware. */
const client = createSmartPetClient({ baseUrl: BASE, token: () => session?.accessToken });
type LooseResult = { data: unknown; error: unknown; response: Response };
const request = (client as unknown as {
  request: (method: string, url: string, init?: Record<string, unknown>) => Promise<LooseResult>;
}).request;

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; retry?: boolean } = {}
): Promise<T> {
  const method = (opts.method ?? 'GET').toLowerCase();

  const { data, error, response } = await request(method, path, {
    ...(opts.body !== undefined ? { body: opts.body } : {}),
    parseAs: 'text',
  });

  if (response.status === 401 && opts.retry !== false && (await doRefresh())) {
    return api<T>(path, { ...opts, retry: false });
  }
  if (response.status === 401) {
    persist(null);
    throw new ApiError(401, 'Session expired');
  }

  const raw = (response.ok ? data : error) as string | null | undefined;
  const parsed = raw ? safeJson(raw) : null;
  if (!response.ok) {
    const msg = (parsed && (parsed.error || parsed.message)) || response.statusText;
    throw new ApiError(response.status, msg, parsed);
  }
  return parsed as T;
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;
  return headers;
}

/** Multipart upload (do not set content-type — the boundary is the browser's). */
export async function apiUpload<T = unknown>(path: string, form: FormData, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: await authHeaders(), body: form });
  if (res.status === 401 && retry && (await doRefresh())) return apiUpload(path, form, false);
  if (res.status === 401) {
    persist(null);
    throw new ApiError(401, 'Session expired');
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, (data && (data.error || data.message)) || res.statusText, data);
  return data as T;
}

async function fetchBlob(path: string, retry = true): Promise<Blob> {
  const res = await fetch(`${BASE}${path}`, { headers: await authHeaders() });
  if (res.status === 401) {
    if (retry && (await doRefresh())) return fetchBlob(path, false);
    persist(null);
    throw new ApiError(401, 'Session expired');
  }
  if (!res.ok) {
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    throw new ApiError(res.status, (data && (data.error || data.message)) || res.statusText, data);
  }
  return res.blob();
}

/** Trigger a file download for an authenticated path. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const blob = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Open an authenticated file in a new tab (preview). */
export async function apiOpen(path: string): Promise<void> {
  const blob = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
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
