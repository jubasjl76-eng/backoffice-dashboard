import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { onRateLimited } from '../lib/rateLimitBus';
import { Btn } from './ui';

/**
 * Non-blocking rate-limit toast (Phase 20 flag-gated UX — see
 * `useApi.ts#RATE_LIMIT_UX_FLAG`). Mounted once in `Layout`; renders nothing
 * until a query/mutation hits an exhausted `RateLimitedError`.
 */
export function RateLimitBanner() {
  const { t } = useT();
  const [state, setState] = useState<{ untilMs: number; retry: () => void } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () => onRateLimited((retryAfterMs, retry) => setState({ untilMs: Date.now() + retryAfterMs, retry })),
    []
  );

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state]);

  if (!state) return null;
  const remaining = Math.max(0, Math.ceil((state.untilMs - now) / 1000));

  return (
    <div
      role="status"
      className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-amber-800 bg-amber-950 px-4 py-2 text-sm text-amber-100 shadow-lg"
    >
      <span>{t('common.rateLimited', { seconds: remaining })}</span>
      <Btn
        variant="subtle"
        size="sm"
        disabled={remaining > 0}
        onClick={() => {
          const retry = state.retry;
          setState(null);
          retry();
        }}
      >
        {t('common.retryNow')}
      </Btn>
      <button
        type="button"
        className="text-amber-300 opacity-70 hover:opacity-100"
        aria-label={t('common.close')}
        onClick={() => setState(null)}
      >
        ✕
      </button>
    </div>
  );
}
