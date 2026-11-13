import { useEffect } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SET_TIMEOUT_8000 = 8000;

const toRemovedText = (count: number): string => {
  if (count > 1) {
    return `${count}${copy.frameSelectRemoved}`;
  }

  return copy.frameRemoved;
};

const FrameUndoBar = ({
  count,
  onUndo,
  onDismiss,
}: {
  count: number;
  onUndo: (() => void) | null;
  onDismiss: () => void;
}): ReactElement | null => {
  const isShown = onUndo !== null;

  useEffect(() => {
    if (!isShown) {
      return;
    }

    const timer = globalThis.setTimeout(onDismiss, SET_TIMEOUT_8000);

    return (): void => globalThis.clearTimeout(timer);
  }, [isShown, onDismiss]);

  if (!onUndo) {
    return null;
  }

  return (
    <output className="frame-undo">
      <span>{toRemovedText(count)}</span>
      <button type="button" className="link" onClick={onUndo}>
        {copy.undo}
      </button>
    </output>
  );
};

export { FrameUndoBar };
