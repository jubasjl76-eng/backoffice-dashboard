import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { shortDate, timeAgo, titleCase } from '../lib/format';
import { en } from './en';
import { interpolate, lookup } from './lookup';
import { pt } from './pt';
import type { Locale, Vars } from './types';

const STORAGE = 'smartpet.locale';
const messages = { pt, en };

function readStored(): Locale {
  try {
    const v = localStorage.getItem(STORAGE);
    if (v === 'en' || v === 'pt') return v;
  } catch {
    /* ignore */
  }
  return 'pt';
}

export type TFn = (key: string, vars?: Vars) => string;

interface LocaleCtx {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFn;
  label: (group: string, value: string | null | undefined) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      const raw = lookup(messages[locale], key) ?? lookup(messages.en, key);
      return interpolate(raw ?? key, vars);
    },
    [locale],
  );

  const label = useCallback(
    (group: string, value: string | null | undefined) => {
      if (!value) return '—';
      const key = `enum.${group}.${value}`;
      const v = t(key);
      return v === key ? titleCase(value) : v;
    },
    [t],
  );

  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt' : 'en';
    document.title = t('app.title');
  }, [locale, t]);

  const value = useMemo(() => ({ locale, setLocale, t, label }), [locale, setLocale, t, label]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): LocaleCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useT outside LocaleProvider');
  return c;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDates() {
  const { locale } = useT();
  return {
    timeAgo: (iso: Parameters<typeof timeAgo>[0]) => timeAgo(iso, locale),
    shortDate: (iso: Parameters<typeof shortDate>[0]) => shortDate(iso, locale),
  };
}
