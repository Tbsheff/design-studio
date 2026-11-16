import { useCallback, useMemo } from "react";

import type { RunUndoAction } from "./chat-parts-model.js";
import type { RunCallbacks, TurnActions } from "./chat-turn-model.js";
import { toRunAction, toUndo, toVersionAction } from "./run-entry-model.js";
import type { RunBodyTailProps } from "./run-entry-model.js";
import type { RunView } from "./run-state-model.js";

interface RunEntryOptions {
  readonly run: RunView;
  readonly latest: boolean;
  readonly callbacks: RunCallbacks;
  readonly actions: TurnActions | null;
  readonly undoVersionId: string | null;
  readonly undoTip: string | null;
  readonly reviewVersionId: string | null;
  readonly onReview: ((versionId: string) => void) | null;
  readonly onDetails: (runId: string) => void;
}

interface RunEntryState {
  readonly tail: RunBodyTailProps;
  readonly undo: RunUndoAction | null;
  readonly retry: (() => void) | null;
}

const useRunEntry = (options: RunEntryOptions): RunEntryState => {
  const { run, callbacks, actions, undoVersionId, undoTip } = options;
  const { reviewVersionId, onReview, onDetails } = options;
  const { runId } = run;
  const details = useCallback(() => onDetails(runId), [onDetails, runId]);

  const review = useMemo(
    () => toVersionAction(onReview, reviewVersionId),
    [onReview, reviewVersionId]
  );

  const restore = actions?.onRestore ?? null;

  const undo = useMemo(
    () => toUndo(toVersionAction(restore, undoVersionId), undoTip),
    [restore, undoVersionId, undoTip]
  );

  const retry = useMemo(
    () => toRunAction(callbacks.onRetry, run),
    [callbacks.onRetry, run]
  );

  const approve = useMemo(
    () => toRunAction(callbacks.onApprovePlan, run),
    [callbacks.onApprovePlan, run]
  );

  const tail = useMemo(
    () => ({
      latest: options.latest,
      onApprovePlan: approve,
      onDetails: details,
      onReview: review,
      run,
    }),
    [options.latest, approve, details, review, run]
  );

  return { retry, tail, undo };
};

export { useRunEntry };

export type { RunEntryOptions, RunEntryState };
