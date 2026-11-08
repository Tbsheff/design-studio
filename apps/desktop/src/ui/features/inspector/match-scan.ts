import type { SelectionContext } from "@design-studio/contracts";
import type {
  StyleHit,
  StyleKind,
  StyleQuery,
  StyleScanResult,
  StyleValueRow,
  TokenLookup,
} from "@design-studio/contracts/style-search";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MutableRefObject } from "react";

import { tokenFieldState } from "../../../shared/token-match.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { getAuthoredCss } from "./use-authored-css.js";

interface InspectorMatchProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly tokens: DesignTokens | null;
  readonly drain: () => Promise<void>;
}

type Scope = "selection" | "page";

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "busy"; readonly text: string }
  | { readonly kind: "done"; readonly text: string }
  | { readonly kind: "error"; readonly text: string };

const REPLY_MS = 5000;
const ROWS_SHOWN = 6;
const PICK_SHOWN = 8;

const KIND_LABEL: Record<StyleKind, string> = {
  color: "Colors",
  "font-size": "Font sizes",
  radius: "Radii",
  spacing: "Spacing",
};

const KIND_EXAMPLE: Record<StyleKind, string> = {
  color: "--accent or bg-accent",
  "font-size": "--text-lg or text-lg",
  radius: "--radius or rounded-lg",
  spacing: "--space-4 or p-4",
};

const CUSTOM_PROP = /(--[\w-]+)\s*:\s*([^;]+)/gu;

interface PageVar {
  readonly name: string;
  readonly value: string;
}

const parseVars = (css: string[]): PageVar[] => {
  const found = new Map<string, string>();

  for (const text of css) {
    for (const match of text.matchAll(CUSTOM_PROP)) {
      if (match[1] && match[2]) {
        found.set(match[1], match[2].trim());
      }
    }
  }

  return [...found].map(([name, value]) => ({ name, value }));
};

const usePageVars = (
  port: MutableRefObject<PreviewPort | null>,
  open: boolean
): PageVar[] => {
  const [vars, setVars] = useState<PageVar[]>([]);
  useEffect(() => {
    if (!open) {
      return;
    }

    let live = true;
    startTransition(async () => {
      const css = await getAuthoredCss(port.current, "html");

      if (live && css) {
        setVars(parseVars([...css.rules.map((rule) => rule.css), css.inline]));
      }
    });

    return (): void => {
      live = false;
    };
  }, [port, open]);

  return vars;
};

const rowKey = (row: Pick<StyleValueRow, "kind" | "value">): string =>
  `${row.kind}|${row.value}`;

const requestStyles = (
  port: PreviewPort | null,
  query: StyleQuery,
  select: boolean
): Promise<{
  readonly result: StyleScanResult;
  readonly selected: number;
} | null> => {
  const listen = port?.listen;

  if (!port || !listen) {
    return Promise.resolve(null);
  }

  const requestId = Math.random().toString(36).slice(2);

  return new Promise((resolve) => {
    const stop = listen((message) => {
      if (message.type !== "styles-found" || message.requestId !== requestId) {
        return;
      }

      finish({ result: message.result, selected: message.selected });
    });

    const timer = globalThis.setTimeout(() => finish(null), REPLY_MS);

    const finish = (
      value: {
        readonly result: StyleScanResult;
        readonly selected: number;
      } | null
    ): void => {
      globalThis.clearTimeout(timer);
      stop();
      resolve(value);
    };

    port.post({ query, requestId, select, type: "find-styles" });
  });
};

const lookupFor = (tokens: DesignTokens | null): TokenLookup | null => {
  if (!tokens || tokens.entries.length === 0) {
    return null;
  }

  return (property, value) => {
    const state = tokenFieldState(property, value, tokens.entries, tokens.mode);

    return state.kind === "token" ? state.match.cssVar : null;
  };
};

const useStyleScan = (
  port: MutableRefObject<PreviewPort | null>,
  query: StyleQuery,
  key: string
): { readonly hits: StyleHit[] | null; readonly refresh: () => void } => {
  const [hits, setHits] = useState<StyleHit[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    let live = true;
    startTransition(async () => {
      const reply = await requestStyles(port.current, queryRef.current, false);

      if (live) {
        setHits(reply ? reply.result.hits : []);
      }
    });

    return (): void => {
      live = false;
    };
  }, [port, key, nonce]);
  useEffect(() => {
    const listen = port.current?.listen;

    if (!listen) {
      return;
    }

    return listen((message) => {
      if (message.type === "ready") {
        setNonce((count) => count + 1);
      }
    });
  }, [port]);

  return {
    hits,
    refresh: useCallback(() => setNonce((countValue) => countValue + 1), []),
  };
};

export {
  KIND_EXAMPLE,
  KIND_LABEL,
  PICK_SHOWN,
  ROWS_SHOWN,
  lookupFor,
  requestStyles,
  rowKey,
  usePageVars,
  useStyleScan,
};

export type { InspectorMatchProps, PageVar, Scope, Status };
