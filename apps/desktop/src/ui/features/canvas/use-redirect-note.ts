import { useEffect, useState } from "react";

import type { Listen } from "./app-canvas-routes-model.js";
import type { FrameRedirect } from "./frame-label-model.js";

interface HeldNote {
  readonly key: string;
  readonly note: FrameRedirect | null;
}

const noop = (): null => null;

const toPathname = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const useRedirectNote = (
  listen: Listen,
  isEnabled: boolean,
  resetKey: string
): FrameRedirect | null => {
  const [held, setHeld] = useState<HeldNote>({ key: resetKey, note: null });

  useEffect(() => {
    if (!isEnabled) {
      return noop;
    }

    return listen((message) => {
      if (message.type !== "ready") {
        return;
      }

      if (!message.redirectedFrom) {
        setHeld({ key: resetKey, note: null });

        return;
      }

      setHeld({
        key: resetKey,
        note: { from: message.redirectedFrom, to: toPathname(message.url) },
      });
    });
  }, [listen, isEnabled, resetKey]);

  if (held.key === resetKey) {
    return held.note;
  }

  return null;
};

export { useRedirectNote };
