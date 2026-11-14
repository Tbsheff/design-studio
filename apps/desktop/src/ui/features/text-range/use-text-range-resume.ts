import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { PREVIEW_PAINTED_EVENT } from "../../platform/preview-painted.js";
import type { BridgeToParent, PreviewPort, TextRangeLayer } from "./deps.js";

interface TextRangeResume {
  readonly arm: (layer: TextRangeLayer) => void;
  readonly drop: () => void;
}

interface PendingResume {
  readonly armedAt: number;
  readonly frameToken: string | null;
  readonly layer: TextRangeLayer;
}

const RESUME_MAX_MS = 15_000;

const SWAP_MAX_MS = 3000;

const isFresh = (pending: PendingResume): boolean => {
  let limit = RESUME_MAX_MS;

  if (pending.frameToken !== null) {
    limit = SWAP_MAX_MS;
  }

  return Date.now() - pending.armedAt <= limit;
};

const isResumed = (message: BridgeToParent, pending: PendingResume): boolean =>
  message.type === "text-edit" &&
  (pending.frameToken === null || message.token === pending.frameToken);

const useTextRangeResume = (
  port: RefObject<PreviewPort | null>,
  selector: string | null
): TextRangeResume => {
  const pending = useRef<PendingResume | null>(null);

  useEffect(() => {
    const listen = port.current?.listen;

    if (!listen || (selector === null && pending.current === null)) {
      return;
    }

    return listen((message) => {
      const armed = pending.current;

      if (armed === null) {
        return;
      }

      if (!isFresh(armed) || isResumed(message, armed)) {
        pending.current = null;

        return;
      }

      if (message.type !== "ready" || armed.frameToken !== null) {
        return;
      }

      pending.current = {
        armedAt: Date.now(),
        frameToken: message.token,
        layer: armed.layer,
      };
      port.current?.post({ type: "text-edit-stop" });
    });
  }, [port, selector]);

  useEffect(() => {
    const onPainted = (): void => {
      const armed = pending.current;

      if (armed === null || armed.frameToken === null) {
        return;
      }

      if (!isFresh(armed)) {
        pending.current = null;

        return;
      }

      port.current?.post({
        ...armed.layer,
        frameToken: armed.frameToken,
        type: "text-edit-resume",
      });
    };

    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, onPainted);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_PAINTED_EVENT, onPainted);
    };
  }, [port]);

  const arm = useCallback((layer: TextRangeLayer): void => {
    pending.current = { armedAt: Date.now(), frameToken: null, layer };
  }, []);

  const drop = useCallback((): void => {
    pending.current = null;
  }, []);

  return { arm, drop };
};

export { useTextRangeResume };

export type { TextRangeResume };
