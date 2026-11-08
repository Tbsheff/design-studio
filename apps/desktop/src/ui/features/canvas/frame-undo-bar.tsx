import { useEffect } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SET_TIMEOUT_8000 = 8000;

const FrameUndoBar = ({
  onUndo,
  onDismiss,
}: {
  onUndo: (() => void) | null;
  onDismiss: () => void;
}): ReactElement | null => {
  useEffect(() => {
    if (!onUndo) {
      return;
    }

    const timer = globalThis.setTimeout(onDismiss, SET_TIMEOUT_8000);

    return (): void => globalThis.clearTimeout(timer);
  }, [onUndo, onDismiss]);

  if (!onUndo) {
    return null;
  }

  return (
    <output className="frame-undo">
      <span>{copy.frameRemoved}</span>
      <button type="button" className="link" onClick={onUndo}>
        {copy.undo}
      </button>
    </output>
  );
};

export { FrameUndoBar };
