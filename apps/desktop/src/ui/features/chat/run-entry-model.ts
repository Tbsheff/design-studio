import type { RunUndoAction } from "./chat-parts-model.js";
import type { RunView } from "./run-state-model.js";

const toVersionAction = (
  action: ((versionId: string) => void) | null,
  versionId: string | null
): (() => void) | null => {
  if (action && versionId) {
    return (): void => action(versionId);
  }

  return null;
};

const toRunAction = (
  action: ((run: RunView) => void) | null,
  run: RunView
): (() => void) | null => {
  if (action) {
    return (): void => action(run);
  }

  return null;
};

const toUndo = (
  onUndo: (() => void) | null,
  tip: string | null
): RunUndoAction | null => {
  if (onUndo) {
    return { onUndo, tip };
  }

  return null;
};

interface RunBodyTailProps {
  readonly run: RunView;
  readonly latest: boolean;
  readonly headVersionId: string | null;
  readonly isPolishDisabled: boolean;
  readonly onDetails: () => void;
  readonly onReview: (() => void) | null;
  readonly onPolish: () => void;
  readonly onApprovePlan: (() => void) | null;
}

export { toRunAction, toUndo, toVersionAction };

export type { RunBodyTailProps };
