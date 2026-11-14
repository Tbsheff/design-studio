import { useEffect } from "react";

import { postToFrame } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { markTextUndo } from "./preview-key-forward.js";
import { PREVIEW_TEXT_UNDO_EVENT } from "./use-undo-shortcut.js";

const isRedoEvent = (event: Event): boolean =>
  (event as CustomEvent<{ redo?: unknown }>).detail?.redo === true;

const useFrameTextUndo = (getFrames: () => BridgeFrame[]): void => {
  useEffect(() => {
    const onTextUndo = (event: Event): void => {
      const frame =
        getFrames().find((item) => item.element === document.activeElement) ??
        null;

      if (frame === null) {
        return;
      }

      event.preventDefault();
      markTextUndo(frame.token);
      postToFrame(frame, { redo: isRedoEvent(event), type: "text-undo" });
    };

    globalThis.addEventListener(PREVIEW_TEXT_UNDO_EVENT, onTextUndo);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_TEXT_UNDO_EVENT, onTextUndo);
    };
  }, [getFrames]);
};

export { useFrameTextUndo };
