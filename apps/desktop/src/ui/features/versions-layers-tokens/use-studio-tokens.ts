import type { Version } from "@design-studio/contracts";
import { useCallback } from "react";

import { useUndoShortcut } from "../canvas/use-undo-shortcut.js";
import type { RedoShortcut } from "../canvas/use-undo-shortcut.js";
import { useTokenFrameSync } from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
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

function useStudioTokens(o: Options) {
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
        draft,
        sweep: { directionId: o.directionId, projectId: o.projectId },
        tokens: o.tokens,
      }
    : null;

  return { draft, guard, panel };
}

export { useStudioTokens };
