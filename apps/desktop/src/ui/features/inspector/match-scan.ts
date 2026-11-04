import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import type { SelectionContext } from "@design-studio/actions/_core/contracts";
import type {
  StyleHit,
  StyleKind,
  StyleQuery,
  StyleScanResult,
  StyleValueRow,
  TokenLookup,
} from "@design-studio/actions/_core/style-search";
import { tokenFieldState } from "../../../shared/token-match.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { requestAuthoredCss } from "./use-authored-css.js";

interface InspectorMatchProps {
  projectId: string;
  directionId: string;
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  tokens: DesignTokens | null;
  drain: () => Promise<void>;
}

type Scope = "selection" | "page";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

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
  name: string;
  value: string;
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
    void requestAuthoredCss(port.current, "html").then((css) => {
      if (live && css) {
        setVars(parseVars([...css.rules.map((rule) => rule.css), css.inline]));
      }
    });

    return () => {
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
): Promise<{ result: StyleScanResult; selected: number } | null> => {
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

    const timer = window.setTimeout(() => finish(null), REPLY_MS);

    function finish(
      value: { result: StyleScanResult; selected: number } | null
    ) {
      window.clearTimeout(timer);
      stop();
      resolve(value);
    }

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
) => {
  const [hits, setHits] = useState<StyleHit[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    let live = true;
    void requestStyles(port.current, queryRef.current, false).then((reply) => {
      if (live) {
        setHits(reply ? reply.result.hits : []);
      }
    });

    return () => {
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
        setNonce((n) => n + 1);
      }
    });
  }, [port]);

  return { hits, refresh: useCallback(() => setNonce((n) => n + 1), []) };
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
