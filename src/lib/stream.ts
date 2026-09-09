import { useEffect, useRef } from 'react';
import { streamUrl, getSession } from './api';

export type StreamEvent =
  | { type: 'exception'; action: 'created' | 'updated'; exception: Record<string, unknown> }
  | { type: 'device'; deviceId: string; status: string }
  | { type: 'rule_fired'; rule: string }
  | { type: 'notification'; exceptionId: string; channel: string; status: string }
  | { type: 'ping' };

/**
 * Subscribe to the backend SSE stream. `onEvent` is called for every server
 * event; it's kept in a ref so the connection isn't torn down on each render.
 */
export function useStream(onEvent: (e: StreamEvent) => void) {
  const cb = useRef(onEvent);
  useEffect(() => {
    cb.current = onEvent;
  });

  useEffect(() => {
    if (!getSession()) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      es = new EventSource(streamUrl());
      const types: StreamEvent['type'][] = ['exception', 'device', 'rule_fired', 'notification', 'ping'];
      for (const t of types) {
        es.addEventListener(t, (ev) => {
          try {
            cb.current(JSON.parse((ev as MessageEvent).data));
          } catch {
            /* ignore malformed frame */
          }
        });
      }
      es.onerror = () => {
        es?.close();
        if (!closed) retry = setTimeout(connect, 4000);
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, []);
}
