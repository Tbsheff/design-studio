import type {
  StyleHit,
  StyleQuery,
  StyleScanResult,
} from "@design-studio/contracts/style-search";
import { startTransition, useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { REPLY_MS, REQUEST_ID_RADIX, listVars } from "./match-scan-model.js";
import type { PageVar } from "./match-scan-model.js";
import { getAuthoredCss } from "./use-authored-css.js";

interface StylesReply {
  readonly result: StyleScanResult;
  readonly selected: number;
}

interface StyleScan {
  readonly hits: StyleHit[] | null;
  readonly refresh: () => void;
}

const toPort = (
  port: MutableRefObject<PreviewPort | null>
): PreviewPort | null => port.current;

const usePageVars = (
  port: MutableRefObject<PreviewPort | null>,
  isOpen: boolean
): PageVar[] => {
  const [vars, setVars] = useState<PageVar[]>([]);
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isLive = true;
    startTransition(async () => {
      const css = await getAuthoredCss(port.current, "html");

      if (isLive && css) {
        setVars(listVars([...css.rules.map((rule) => rule.css), css.inline]));
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [port, isOpen]);

  return vars;
};

const getStyles = (
  port: PreviewPort | null,
  query: StyleQuery,
  select: boolean
): Promise<StylesReply | null> => {
  const listen = port?.listen;

  if (!port || !listen) {
    return Promise.resolve(null);
  }

  const requestId = Math.random().toString(REQUEST_ID_RADIX).slice(2);
  const { promise, resolve } = Promise.withResolvers<StylesReply | null>();
  const stops: (() => void)[] = [];
  const timers: ReturnType<typeof globalThis.setTimeout>[] = [];

  const finish = (value: StylesReply | null): void => {
    for (const timer of timers) {
      globalThis.clearTimeout(timer);
    }

    for (const stop of stops) {
      stop();
    }

    resolve(value);
  };

  stops.push(
    listen((message) => {
      if (message.type === "styles-found" && message.requestId === requestId) {
        finish({ result: message.result, selected: message.selected });
      }
    })
  );

  timers.push(globalThis.setTimeout(() => finish(null), REPLY_MS));
  port.post({ query, requestId, select, type: "find-styles" });

  return promise;
};

const useStyleScan = (
  port: MutableRefObject<PreviewPort | null>,
  query: StyleQuery
): StyleScan => {
  const [hits, setHits] = useState<StyleHit[] | null>(null);

  const load = useCallback(
    (signal: AbortSignal) => {
      startTransition(async () => {
        const reply = await getStyles(toPort(port), query, false);

        if (!signal.aborted) {
          setHits(reply?.result.hits ?? []);
        }
      });
    },
    [port, query]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [load]);
  useEffect(() => {
    const listen = port.current?.listen;

    if (!listen) {
      return;
    }

    return listen((message) => {
      if (message.type === "ready") {
        load(new AbortController().signal);
      }
    });
  }, [port, load]);

  const refresh = useCallback(() => load(new AbortController().signal), [load]);

  return { hits, refresh };
};

export { getStyles, usePageVars, useStyleScan };
