import { useCallback, useEffect, useRef } from 'react';
import type { BridgeToParent } from '../shared/contracts';
import type { ParentMessageBody } from './bridge';

const SETTLE_MS = 250;
const NO_RELOAD_MS = 900;
const GIVE_UP_MS = 30_000;

interface Port {
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
}

interface Pending {
  x: number;
  y: number;
  at: number;
}

export type ClickThrough = (point: { x: number; y: number }) => void;

export function useClickThrough(port: Port, enabled: boolean): ClickThrough {
  const pending = useRef<Pending | null>(null);
  const timers = useRef<number[]>([]);
  const live = useRef({ port, enabled });
  live.current = { port, enabled };

  const send = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    if (Date.now() - p.at > GIVE_UP_MS) {
      pending.current = null;
      return;
    }
    live.current.port.post({ type: 'select-at', x: p.x, y: p.y });
  }, []);

  const later = useCallback((ms: number) => timers.current.push(window.setTimeout(send, ms)), [send]);

  useEffect(
    () =>
      port.listen((msg) => {
        if (!pending.current) return;
        if (msg.type === 'ready') later(SETTLE_MS);
        else if (msg.type === 'select') pending.current = null;
      }),
    [port.listen, later],
  );

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return useCallback(
    (point) => {
      if (!live.current.enabled) return;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      pending.current = { x: point.x, y: point.y, at: Date.now() };
      later(NO_RELOAD_MS);
    },
    [later],
  );
}
