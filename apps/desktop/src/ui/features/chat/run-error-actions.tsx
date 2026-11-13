import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { findElement } from "../../platform/find-element.js";
import type { RunUndoAction } from "./chat-parts-model.js";
import { copy } from "./copy.js";

const undoRun = (undo: RunUndoAction, button: HTMLButtonElement): void => {
  if (undo.tip !== null) {
    return;
  }

  const sibling = findElement(
    button.parentElement ?? document.body,
    ".btn:not(.ghost)"
  );

  const next =
    sibling ??
    findElement(document.body, '.prompt [data-slot="composer-input"]');

  undo.onUndo();
  next?.focus();
};

const RunErrorActions = ({
  retry,
  undo,
  onDetails,
}: {
  retry: (() => void) | null;
  undo: RunUndoAction | null;
  onDetails: () => void;
}): ReactElement => {
  const onUndoClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      if (undo) {
        undoRun(undo, event.currentTarget);
      }
    },
    [undo]
  );

  return (
    <div className="run-error-actions">
      {retry && (
        <button type="button" className="btn small" onClick={retry}>
          {copy.retry2}
        </button>
      )}
      <button type="button" className="btn small ghost" onClick={onDetails}>
        {copy.details}
      </button>
      {undo && (
        <button
          type="button"
          className="btn small ghost"
          aria-disabled={undo.tip !== null}
          data-tip={undo.tip ?? copy.undoItsChangesTip}
          data-tip-side="top"
          onClick={onUndoClick}
        >
          {copy.undoItsChanges}
        </button>
      )}
    </div>
  );
};

export { RunErrorActions };
