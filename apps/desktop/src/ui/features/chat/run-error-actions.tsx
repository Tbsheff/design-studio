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
}: {
  retry: (() => void) | null;
  undo: RunUndoAction | null;
}): ReactElement | null => {
  const onUndoClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      if (undo) {
        undoRun(undo, event.currentTarget);
      }
    },
    [undo]
  );

  if (!retry && !undo) {
    return null;
  }

  return (
    <span className="run-retry flex items-center gap-1">
      {undo && (
        <button
          type="button"
          className="btn small ghost"
          aria-disabled={undo.tip !== null}
          data-tip={undo.tip ?? "Go back to the version before this run"}
          data-tip-side="top"
          onClick={onUndoClick}
        >
          {copy.undoItsChanges}
        </button>
      )}
      {retry && (
        <button type="button" className="btn small" onClick={retry}>
          {copy.retry2}
        </button>
      )}
    </span>
  );
};

export { RunErrorActions };
