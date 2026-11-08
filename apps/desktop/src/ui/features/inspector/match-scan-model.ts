import type { SelectionContext } from "@design-studio/contracts";
import type {
  StyleKind,
  StyleQuery,
  StyleValueRow,
  TokenLookup,
} from "@design-studio/contracts/style-search";
import type { MutableRefObject } from "react";

import { tokenFieldState } from "../../../shared/token-match.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "./deps.js";

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

interface PageVar {
  readonly name: string;
  readonly value: string;
}

const REPLY_MS = 5000;
const ROWS_SHOWN = 6;
const PICK_SHOWN = 8;
const REQUEST_ID_RADIX = 36;
const PAGE_QUERY: StyleQuery = {};

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

const CUSTOM_PROP_NAME = /^--[\w-]+$/u;
const DECLARATION_SPLIT = /[;{}]/u;

const toRowKey = (row: Pick<StyleValueRow, "kind" | "value">): string =>
  `${row.kind}|${row.value}`;

const listVars = (css: string[]): PageVar[] => {
  const found = new Map<string, string>();

  for (const text of css) {
    for (const chunk of text.split(DECLARATION_SPLIT)) {
      const declaration = chunk.trim();
      const colon = declaration.indexOf(":");
      const name = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();

      if (colon > 0 && CUSTOM_PROP_NAME.test(name) && value) {
        found.set(name, value);
      }
    }
  }

  return [...found].map(([name, value]) => ({ name, value }));
};

const toTokenVar = (
  tokens: DesignTokens,
  property: Parameters<TokenLookup>[0],
  value: string
): string | null => {
  const state = tokenFieldState(property, value, tokens.entries, tokens.mode);

  if (state.kind === "token") {
    return state.match.cssVar;
  }

  return null;
};

const toLookup = (tokens: DesignTokens | null): TokenLookup | null => {
  if (!tokens || tokens.entries.length === 0) {
    return null;
  }

  return (property, value) => toTokenVar(tokens, property, value);
};

export {
  KIND_EXAMPLE,
  KIND_LABEL,
  PAGE_QUERY,
  PICK_SHOWN,
  REPLY_MS,
  REQUEST_ID_RADIX,
  ROWS_SHOWN,
  listVars,
  toLookup,
  toRowKey,
};

export type { InspectorMatchProps, PageVar, Scope, Status };
