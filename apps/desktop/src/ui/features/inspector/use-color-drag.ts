import { useCallback } from "react";
import type { PointerEvent } from "react";

import { toPadColor } from "./color-popup-model.js";
import type { ColorPopupState } from "./use-color-popup.js";

type PadEvent = PointerEvent<HTMLButtonElement>;

interface ColorPadDrag {
  readonly handlePointerDown: (event: PadEvent) => void;
  readonly handlePointerMove: (event: PadEvent) => void;
  readonly handlePointerUp: (event: PadEvent) => void;
}

const useColorDrag = (popup: ColorPopupState): ColorPadDrag => {
  const { beginDrag, endDrag, setColor, hsva } = popup;

  const moveTo = useCallback(
    (event: PadEvent): void => {
      const rect = event.currentTarget.getBoundingClientRect();
      setColor(toPadColor(hsva, rect, event.clientX, event.clientY));
    },
    [setColor, hsva]
  );

  const handlePointerDown = useCallback(
    (event: PadEvent): void => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
      beginDrag();
      moveTo(event);
    },
    [beginDrag, moveTo]
  );

  const handlePointerMove = useCallback(
    (event: PadEvent): void => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        moveTo(event);
      }
    },
    [moveTo]
  );

  const handlePointerUp = useCallback(
    (event: PadEvent): void => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      moveTo(event);
      endDrag();
    },
    [moveTo, endDrag]
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};

export { useColorDrag };

export type { ColorPadDrag };
