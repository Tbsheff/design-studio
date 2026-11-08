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
import type { StyleValues } from "./css-values.js";

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

  const best = matchForProperty(prop, value, entries, mode)[0];

  return isSnappable(group, best) ? best.cssVar : null;
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
  const live = useRef({ snapOn, tokens });
  live.current = { snapOn, tokens };

  const rewrite = useCallback((style: Partial<StyleValues>) => {
    const { tokens: token, snapOn: on } = live.current;

    if (!token || !on) {
      setNote(null);

      return style;
    }

    const out: Partial<StyleValues> = { ...style };
    const raw: Partial<StyleValues> = {};
    let cssVar: string | null = null;

    for (const [prop, value] of Object.entries(style) as [
      DirectStyleProperty,
      string,
    ][]) {
      if (kept.current[prop] === value) {
        continue;
      }

      const target = toSnapTarget(prop, value, token.entries, token.mode);

      if (!target) {
        continue;
      }

      out[prop] = `var(${target})`;
      raw[prop] = value;
      cssVar = cssVar ?? target;
    }

    setNote(cssVar ? { cssVar, raw } : null);

    return out;
  }, []);

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
