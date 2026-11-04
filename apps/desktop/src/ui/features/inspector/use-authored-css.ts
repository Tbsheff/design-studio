import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { parseAuthoredReply } from "./authored-css.js";
import type { AuthoredCss } from "./authored-css.js";

const REPLY_TIMEOUT_MS = 1500;

export interface AuthoredCssState {
  css: AuthoredCss | null;
  request: () => Promise<AuthoredCss | null>;
}

export const requestAuthoredCss = (
  port: PreviewPort | null,
  selector: string
): Promise<AuthoredCss | null> => {
  const listen = port?.listen;

  if (!port || !listen) {
    return Promise.resolve(null);
  }

  const requestId = Math.random().toString(36).slice(2);

  return new Promise((resolve) => {
    const stop = listen((message) => {
      if (message.type !== "authored" || message.requestId !== requestId) {
        return;
      }

      finish(parseAuthoredReply(message));
    });

    const timer = window.setTimeout(() => finish(null), REPLY_TIMEOUT_MS);

    function finish(result: AuthoredCss | null) {
      window.clearTimeout(timer);
      stop();
      resolve(result);
    }

    port.post({ requestId, selector, type: "request-authored" });
  });
};

export const useAuthoredCss = (
  port: MutableRefObject<PreviewPort | null>,
  selector: string
): AuthoredCssState => {
  const [css, setCss] = useState<AuthoredCss | null>(null);
  const live = useRef(true);

  const request = useCallback(async () => {
    const result = await requestAuthoredCss(port.current, selector);

    if (live.current && result) {
      setCss(result);
    }

    return result;
  }, [port, selector]);

  useEffect(() => {
    live.current = true;
    void request();

    return () => {
      live.current = false;
    };
  }, [request]);

  return { css, request };
};
