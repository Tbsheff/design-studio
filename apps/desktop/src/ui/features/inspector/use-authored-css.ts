import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { toAuthoredReply } from "./authored-css-model.js";
import type { AuthoredCss } from "./authored-css-model.js";

const REPLY_TIMEOUT_MS = 1500;
const RADIX = 36;

interface AuthoredCssState {
  readonly css: AuthoredCss | null;
  readonly request: () => Promise<AuthoredCss | null>;
}

const getAuthoredCss = (
  port: PreviewPort | null,
  selector: string
): Promise<AuthoredCss | null> => {
  const listen = port?.listen;

  if (!port || !listen) {
    return Promise.resolve(null);
  }

  const requestId = Math.random().toString(RADIX).slice(2);
  const { promise, resolve } = Promise.withResolvers<AuthoredCss | null>();
  const stops: (() => void)[] = [];

  const finish = (result: AuthoredCss | null): void => {
    for (const stop of stops) {
      stop();
    }

    resolve(result);
  };

  stops.push(
    listen((message) => {
      if (message.type !== "authored" || message.requestId !== requestId) {
        return;
      }

      finish(toAuthoredReply(message));
    })
  );

  const timer = globalThis.setTimeout(() => finish(null), REPLY_TIMEOUT_MS);
  stops.push(() => globalThis.clearTimeout(timer));
  port.post({ requestId, selector, type: "request-authored" });

  return promise;
};

const toPort = (
  ref: MutableRefObject<PreviewPort | null>
): PreviewPort | null => ref.current;

const useAuthoredCss = (
  port: MutableRefObject<PreviewPort | null>,
  selector: string
): AuthoredCssState => {
  const [css, setCss] = useState<AuthoredCss | null>(null);
  const live = useRef(true);

  const request = useCallback(async () => {
    const result = await getAuthoredCss(toPort(port), selector);

    if (live.current && result) {
      setCss(result);
    }

    return result;
  }, [port, selector]);

  useEffect(() => {
    live.current = true;
    void request();

    return (): void => {
      live.current = false;
    };
  }, [request]);

  return { css, request };
};

export { getAuthoredCss, useAuthoredCss };

export type { AuthoredCssState };
