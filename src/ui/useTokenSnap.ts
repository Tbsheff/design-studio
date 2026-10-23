import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TOKEN_GROUP_FOR_PROPERTY, type CompiledTokenEntry, type DirectStyleProperty } from '../shared/contracts';
import { isSnappable, isUnsetValue, matchForProperty, varName, type TokenMode } from '../shared/token-match';
import type { StyleValues } from './cssValues';
import { uiStore, useUi } from './storage';
import type { DesignTokens } from './useDesignSystemState';

export interface SnapNote {
  cssVar: string;
  raw: Partial<StyleValues>;
}

export interface CreateRequest {
  prop: DirectStyleProperty;
  value: string;
  targets: DirectStyleProperty[];
}

export interface TokenUi {
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  snap: boolean;
  setSnap: (on: boolean) => void;
  requestCreate: (req: CreateRequest) => void;
}

export const TokenUiContext = createContext<TokenUi | null>(null);

export function useTokenUi(): TokenUi | null {
  return useContext(TokenUiContext);
}

const NOTE_MS = 8000;

export function snapTarget(prop: DirectStyleProperty, value: string, entries: CompiledTokenEntry[], mode: TokenMode): string | null {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (!group || group === 'font' || varName(value) || isUnsetValue(value)) return null;
  const best = matchForProperty(prop, value, entries, mode)[0];
  return isSnappable(group, best) ? best.cssVar : null;
}

export function useSnapSetting(projectId: string): [boolean, (on: boolean) => void] {
  const ui = useUi();
  const on = ui.snapByProject[projectId] ?? true;
  const set = useCallback(
    (next: boolean) => uiStore.set((s) => ({ snapByProject: { ...s.snapByProject, [projectId]: next } })),
    [projectId],
  );
  return [on, set];
}

export function useTokenSnap(tokens: DesignTokens | null, snapOn: boolean) {
  const [note, setNote] = useState<SnapNote | null>(null);
  const kept = useRef<Partial<StyleValues>>({});
  const live = useRef({ tokens, snapOn });
  live.current = { tokens, snapOn };

  const rewrite = useCallback((style: Partial<StyleValues>) => {
    const { tokens: t, snapOn: on } = live.current;
    if (!t || !on) {
      setNote(null);
      return style;
    }
    const out: Partial<StyleValues> = { ...style };
    const raw: Partial<StyleValues> = {};
    let cssVar: string | null = null;
    for (const [prop, value] of Object.entries(style) as [DirectStyleProperty, string][]) {
      if (kept.current[prop] === value) continue;
      const target = snapTarget(prop, value, t.entries, t.mode);
      if (!target) continue;
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
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), NOTE_MS);
    return () => window.clearTimeout(id);
  }, [note]);

  return useMemo(() => ({ rewrite, note, keepRaw, dismiss }), [rewrite, note, keepRaw, dismiss]);
}
