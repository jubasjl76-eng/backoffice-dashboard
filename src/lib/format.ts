import type { Locale } from '../i18n/types';

export function bcp47(locale: Locale): string {
  return locale === 'pt' ? 'pt-PT' : 'en-GB';
}

export function timeAgo(iso: string | number | null | undefined, locale: Locale = 'pt'): string {
  if (!iso) return '—';
  const t = typeof iso === 'number' ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const s = Math.round((Date.now() - t) / 1000);
  const abs = Math.abs(s);
  const future = s < 0;
  if (abs < 60) return ago(locale, future, `${abs}s`);
  const m = Math.round(abs / 60);
  if (m < 60) return ago(locale, future, `${m}m`);
  const h = Math.round(m / 60);
  if (h < 48) return ago(locale, future, `${h}h`);
  return ago(locale, future, `${Math.round(h / 24)}d`);
}

function ago(locale: Locale, future: boolean, unit: string): string {
  if (locale === 'pt') return future ? `em ${unit}` : `há ${unit}`;
  return future ? `in ${unit}` : `${unit} ago`;
}

export function shortDate(iso: string | null | undefined, locale: Locale = 'pt'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(bcp47(locale), { month: 'short', day: 'numeric', year: 'numeric' });
}

export const severityClass: Record<string, string> = {
  critical: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
};

export const statusDot: Record<string, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-slate-500',
  degraded: 'bg-amber-400',
};

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
