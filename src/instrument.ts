/**
 * Sentry (@sentry/react) — imported first in main.tsx (hardening Phase 15).
 *
 * No VITE_SENTRY_DSN → Sentry.init is a no-op and the app runs exactly as
 * before, so this ships ahead of the Sentry project existing.
 */
import * as Sentry from '@sentry/react';

const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() || undefined;

/** Redact a bearer/refresh token that somehow landed in a URL query string. */
function redactUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    for (const k of ['token', 'access_token', 'refresh_token', 'refreshToken']) {
      if (u.searchParams.has(k)) u.searchParams.set(k, 'REDACTED');
    }
    return u.toString();
  } catch {
    return url;
  }
}

Sentry.init({
  dsn,
  environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) || import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
  // Perf tracing stays off until Phase 16.
  tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.url) event.request.url = redactUrl(event.request.url);
    return event;
  },
  beforeBreadcrumb(crumb) {
    if (crumb.data?.url) crumb.data.url = redactUrl(String(crumb.data.url));
    return crumb;
  },
});

if (dsn) console.info('[sentry] enabled', import.meta.env.MODE);
