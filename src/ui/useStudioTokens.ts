import { useCallback } from 'react';
import type { Version } from '../shared/contracts';
import { useTokenFrameSync } from './tokenFrames';
import type { DesignTokens } from './useDesignSystemState';
import { useTokenDraft } from './useTokenDraft';
import { useUndoShortcut, type RedoShortcut } from './useUndoShortcut';

interface Options {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  canUndo: boolean;
  onUndo: () => void;
  redo?: RedoShortcut;
  onCommitted: (version: Version) => void;
}

export function useStudioTokens(o: Options) {
  const draft = useTokenDraft(o);
  useTokenFrameSync();
  useUndoShortcut(o.canUndo || draft.count > 0, () => (draft.count > 0 ? draft.undoLast() : o.onUndo()), o.redo);
  const { confirmLeave } = draft;
  const guard = useCallback(
    <A extends unknown[]>(fn: (...args: A) => unknown) =>
      async (...args: A): Promise<void> => {
        if (confirmLeave()) await fn(...args);
      },
    [confirmLeave],
  );
  const panel = o.tokens ? { tokens: o.tokens, draft } : null;
  return { draft, guard, panel };
}
