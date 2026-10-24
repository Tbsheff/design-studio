import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompiledTokenEntry, DesignSystemState, Project, TokenFile } from '../shared/contracts';
import type { TokenMode } from '../shared/token-match';
import { api } from './api';
import type { FilesChange } from './useStudioData';

export interface DesignTokens {
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  file: TokenFile | null;
  replace: (state: DesignSystemState) => void;
}

function touchesDesignSystem(change: FilesChange | null, directionId: string | null): number {
  if (!change || change.directionId !== directionId) return 0;
  return change.paths.some((file) => file.startsWith('design-system/')) ? change.receivedAt : 0;
}

export interface DesignSystemView {
  tokens: DesignTokens | null;
  state: DesignSystemState | null;
}

export function useDesignSystemState(projectId: string, project: Project | null, directionId: string | null, lastChange: FilesChange | null): DesignSystemView {
  const [loaded, setLoaded] = useState<{ key: string; state: DesignSystemState } | null>(null);
  const packId = project?.packId ?? null;
  const headVersionId = project?.directions.find((x) => x.id === directionId)?.headVersionId ?? null;
  const stamp = touchesDesignSystem(lastChange, directionId);
  const key = `${projectId}:${directionId}`;
  const live = useRef(key);
  live.current = key;

  useEffect(() => {
    if (!directionId) return;
    const want = `${projectId}:${directionId}`;
    api
      .getDesignSystem(projectId, directionId)
      .then((state) => live.current === want && setLoaded({ key: want, state }))
      .catch(() => undefined);
  }, [projectId, directionId, packId, headVersionId, stamp]);

  const replace = useCallback((state: DesignSystemState) => setLoaded({ key: live.current, state }), []);

  return useMemo(() => {
    const state = loaded?.key === key ? loaded.state : null;
    if (!state || state.entries.length === 0) return { tokens: null, state };
    const tokens: DesignTokens = { entries: state.entries, mode: state.manifest?.mode === 'dark' ? 'dark' : 'light', file: state.tokens, replace };
    return { tokens, state };
  }, [loaded, key, replace]);
}
