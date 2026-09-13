/**
 * Feature flags (Phase 20) — reads the `flags` map `GET /api/config` exposes
 * (backend `src/services/flags.ts`, admin UI: Ops > Flags). Fetched once at
 * module load, then polled every 30s (matches the backend's own cache TTL) so
 * an admin flipping a flag actually reaches already-open tabs — the point of
 * a kill switch. An unknown key (never created, or the fetch failed) reads as
 * `false` — same "off by default" contract as the backend's `isFlagEnabled`.
 */
import { useEffect, useState } from 'react';
import { api } from './api';

type FlagMap = Record<string, boolean>;

let flags: FlagMap = {};
const listeners = new Set<() => void>();

async function load() {
  try {
    const cfg = await api<{ flags: FlagMap }>('/config');
    flags = cfg.flags ?? {};
  } catch {
    /* keep last known flags; unauthenticated endpoint, safe to retry on the next poll */
  }
  listeners.forEach((l) => l());
}

void load();
setInterval(() => void load(), 30_000);

export function isFlagEnabled(key: string): boolean {
  return flags[key] === true;
}

export function useFlag(key: string): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return flags[key] === true;
}
