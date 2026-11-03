import { useCallback } from "react";

import type { Version } from "../../../shared/contracts.js";
import { useTokenFrameSync } from "../../tokenFrames.js";
import type { DesignTokens } from "../../useDesignSystemState.js";
import { useUndoShortcut } from "../../useUndoShortcut.js";
import type { RedoShortcut } from "../../useUndoShortcut.js";
import { useTokenDraft } from "./use-token-draft.js";

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
  useUndoShortcut(
    o.canUndo || draft.count > 0,
    () => (draft.count > 0 ? draft.undoLast() : o.onUndo()),
    o.redo
  );
  const { confirmLeave } = draft;

  const guard = useCallback(
    <A extends unknown[]>(fn: (...args: A) => unknown) =>
      async (...args: A): Promise<void> => {
        if (confirmLeave()) {
          await fn(...args);
        }
      },
    [confirmLeave]
  );

  const panel = o.tokens
    ? {
        sweep: { directionId: o.directionId, projectId: o.projectId },
        tokens: o.tokens,
        draft,
      }
    : null;

  return { draft, guard, panel };
}
