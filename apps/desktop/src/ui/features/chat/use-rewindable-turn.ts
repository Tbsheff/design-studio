import { useCallback, useState, startTransition } from "react";

import type { TurnActions } from "./chat-turn-model.js";
import type { RunView } from "./run-state-model.js";

type Mode = "idle" | "confirm" | "edit" | "rename";

interface TurnRewind {
  restoreTip: string | null;
  restoreVersionId: string | null;
  forkBase: string | null;
  editTip: string | null;
}

interface RewindableTurnOptions {
  readonly actions: TurnActions;
  readonly rewind: TurnRewind;
  readonly run: RunView;
  readonly title: string | undefined;
}

interface RewindableTurnState {
  readonly mode: Mode;
  readonly renameFailed: boolean;
  readonly onCancel: () => void;
  readonly onConfirmRestore: () => void;
  readonly onEdit: () => void;
  readonly onRename: () => void;
  readonly onRenameDone: (next: string | null) => void;
  readonly onRestore: () => void;
  readonly onSend: (prompt: string) => void;
}

const useRewindableTurn = (
  options: RewindableTurnOptions
): RewindableTurnState => {
  const { actions, rewind, run, title } = options;
  const [mode, setMode] = useState<Mode>("idle");
  const [renameFailed, setRenameFailed] = useState(false);
  const { forkBase, restoreVersionId } = rewind;
  const { onEditResend, onRename: renameRun, onRestore: restoreRun } = actions;

  const onCancel = useCallback(() => setMode("idle"), []);
  const onEdit = useCallback(() => setMode("edit"), []);
  const onRename = useCallback(() => setMode("rename"), []);

  const onRestore = useCallback((): void => {
    if (!restoreVersionId) {
      return;
    }

    if (actions.dirtyCount() > 0) {
      setMode("confirm");

      return;
    }

    restoreRun(restoreVersionId);
  }, [actions, restoreVersionId, restoreRun]);

  const onConfirmRestore = useCallback((): void => {
    setMode("idle");

    if (restoreVersionId) {
      restoreRun(restoreVersionId);
    }
  }, [restoreVersionId, restoreRun]);

  const onSend = useCallback(
    (prompt: string): void => {
      setMode("idle");

      if (forkBase) {
        void onEditResend(run, prompt, forkBase);
      }
    },
    [forkBase, onEditResend, run]
  );

  const onRenameDone = useCallback(
    (next: string | null): void => {
      setMode("idle");
      setRenameFailed(false);

      if (next === null || next === (title ?? "")) {
        return;
      }

      startTransition(async () => {
        try {
          await renameRun(run.runId, next);
        } catch {
          setRenameFailed(true);
        }
      });
    },
    [renameRun, run.runId, title]
  );

  return {
    mode,
    onCancel,
    onConfirmRestore,
    onEdit,
    onRename,
    onRenameDone,
    onRestore,
    onSend,
    renameFailed,
  };
};

export { useRewindableTurn };

export type { Mode, TurnRewind };
