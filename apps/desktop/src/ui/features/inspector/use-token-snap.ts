import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  DirectStyleProperty,
} from "@design-studio/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  isSnappable,
  isUnsetValue,
  matchForProperty,
  varName,
} from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { uiStore, useUi } from "../../platform/storage.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import type { StyleValues } from "./css-value-model.js";
import { useLatestRef } from "./use-latest-ref.js";

interface SnapNote {
  readonly cssVar: string;
  readonly raw: Partial<StyleValues>;
}

interface CreateRequest {
  readonly prop: DirectStyleProperty;
  readonly value: string;
  readonly targets: DirectStyleProperty[];
}

interface TokenUi {
  readonly entries: CompiledTokenEntry[];
  readonly mode: TokenMode;
  readonly shouldSnap: boolean;
  readonly setSnap: (on: boolean) => void;
  readonly requestCreate: ((req: CreateRequest) => void) | null;
  readonly keepRaw: (raw: Partial<StyleValues>) => void;
}

const TokenUiContext = createContext<TokenUi | null>(null);

const useTokenUi = (): TokenUi | null => useContext(TokenUiContext);

const NOTE_MS = 8000;

const toSnapTarget = (
  prop: DirectStyleProperty,
  value: string,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): string | null => {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];

  if (!group || group === "font" || varName(value) || isUnsetValue(value)) {
    return null;
  }

  const [best] = matchForProperty(prop, value, entries, mode);

  if (isSnappable(group, best)) {
    return best.cssVar;
  }

  return null;
};

interface SnapRewrite {
  readonly cssVar: string | null;
  readonly out: Partial<StyleValues>;
  readonly raw: Partial<StyleValues>;
}

const toSnapNote = (
  cssVar: string | null,
  raw: Partial<StyleValues>
): SnapNote | null => {
  if (!cssVar) {
    return null;
  }

  return { cssVar, raw };
};

const toSnapRewrite = (
  style: Partial<StyleValues>,
  kept: Partial<StyleValues>,
  token: DesignTokens
): SnapRewrite => {
  const out: Partial<StyleValues> = { ...style };
  const raw: Partial<StyleValues> = {};
  let cssVar: string | null = null;

  for (const [prop, value] of Object.entries(style) as [
    DirectStyleProperty,
    string,
  ][]) {
    const target = toSnapTarget(prop, value, token.entries, token.mode);

    if (kept[prop] !== value && target) {
      out[prop] = `var(${target})`;
      raw[prop] = value;
      cssVar ??= target;
    }
  }

  return { cssVar, out, raw };
};

const useSnapSetting = (
  projectId: string
): [boolean, (on: boolean) => void] => {
  const ui = useUi();
  const on = ui.snapByProject[projectId] ?? true;

  const set = useCallback(
    (next: boolean) =>
      uiStore.set((uiState) => ({
        snapByProject: { ...uiState.snapByProject, [projectId]: next },
      })),
    [projectId]
  );

  return [on, set];
};

interface UseTokenSnapResult {
  readonly dismiss: () => void;
  readonly keepRaw: (raw: Partial<StyleValues>) => void;
  readonly note: SnapNote | null;
  readonly rewrite: (style: Partial<StyleValues>) => Partial<StyleValues>;
}

const useTokenSnap = (
  tokens: DesignTokens | null,
  snapOn: boolean
): UseTokenSnapResult => {
  const [note, setNote] = useState<SnapNote | null>(null);
  const kept = useRef<Partial<StyleValues>>({});
  const live = useLatestRef({ snapOn, tokens });

  const rewrite = useCallback(
    (style: Partial<StyleValues>) => {
      const { tokens: token, snapOn: on } = live.current;

      if (!token || !on) {
        setNote(null);

        return style;
      }

      const { cssVar, out, raw } = toSnapRewrite(style, kept.current, token);
      setNote(toSnapNote(cssVar, raw));

      return out;
    },
    [live]
  );

  const keepRaw = useCallback((raw: Partial<StyleValues>) => {
    kept.current = { ...kept.current, ...raw };
    setNote(null);
  }, []);

  const dismiss = useCallback(() => setNote(null), []);

  useEffect(() => {
    if (!note) {
      return;
    }

    const id = globalThis.setTimeout(() => setNote(null), NOTE_MS);

    return (): void => globalThis.clearTimeout(id);
  }, [note]);

  return useMemo(
    () => ({ dismiss, keepRaw, note, rewrite }),
    [rewrite, note, keepRaw, dismiss]
  );
};

export {
  TokenUiContext,
  useTokenUi,
  toSnapTarget,
  useSnapSetting,
  useTokenSnap,
};

export type { SnapNote, CreateRequest, TokenUi };
