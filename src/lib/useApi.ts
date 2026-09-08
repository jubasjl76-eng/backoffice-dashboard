import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

export function useQuery<T = unknown>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const ver = useRef(0);

  const reload = useCallback(async () => {
    if (!path) return;
    const my = ++ver.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api<T>(path);
      if (my === ver.current) setData(d);
    } catch (e) {
      if (my === ver.current) setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      if (my === ver.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

/** Fire a mutation; returns [run, busy]. */
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        alert(e instanceof ApiError ? e.message : String(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    []
  );
  return [run, busy] as const;
}
