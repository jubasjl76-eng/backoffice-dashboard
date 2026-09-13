/**
 * Tiny pub/sub so `useApi.ts` (no JSX) can hand a `RateLimitedError` off to
 * `<RateLimitBanner>` (mounted once in the Layout) instead of a blocking
 * `alert()`. Flag-gated at the call site — see `RATE_LIMIT_UX_FLAG`.
 */
type Listener = (retryAfterMs: number, retry: () => void) => void;

const listeners = new Set<Listener>();

export function notifyRateLimited(retryAfterMs: number, retry: () => void): void {
  listeners.forEach((l) => l(retryAfterMs, retry));
}

export function onRateLimited(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
