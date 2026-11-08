import type { BridgeToParent } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";

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

type ClickThrough = (point: { x: number; y: number }) => void;

const useClickThrough = (port: Port, enabled: boolean): ClickThrough => {
  const pending = useRef<Pending | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const live = useRef({ enabled, port });

  useEffect(() => {
    live.current = { enabled, port };
  });

  const send = useCallback(() => {
    const pointValue = pending.current;

    if (!pointValue) {
      return;
    }

    if (Date.now() - pointValue.at > GIVE_UP_MS) {
      pending.current = null;

      return;
    }

    live.current.port.post({
      type: "select-at",
      x: pointValue.x,
      y: pointValue.y,
    });
  }, []);

  const later = useCallback(
    (ms: number) => timers.current.push(globalThis.setTimeout(send, ms)),
    [send]
  );

  const { listen } = port;

  useEffect(
    () =>
      listen((msg) => {
        if (!pending.current) {
          return;
        }

        if (msg.type === "ready") {
          later(SETTLE_MS);
        }

        if (msg.type === "select") {
          pending.current = null;
        }
      }),
    [listen, later]
  );

  useEffect(
    () => (): void => {
      for (const target of timers.current) {
        globalThis.clearTimeout(target);
      }
    },
    []
  );

  return useCallback(
    (point) => {
      if (!live.current.enabled) {
        return;
      }

      for (const targetValue of timers.current) {
        globalThis.clearTimeout(targetValue);
      }

      timers.current = [];
      pending.current = { at: Date.now(), x: point.x, y: point.y };
      later(NO_RELOAD_MS);
    },
    [later]
  );
};

export { useClickThrough };

export type { ClickThrough };
