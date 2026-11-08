import { useCallback, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { focalOf, focalText } from "../../../shared/image.js";
import { toFocalAt, toKeyMove, toKeyStep } from "./focal-pad-model.js";

interface FocalPadHandlers {
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly handlePointerCancel: () => void;
  readonly handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  readonly point: { readonly x: number; readonly y: number };
}

const useFocalPad = (
  value: string,
  isDisabled: boolean,
  onPick: (focal: string) => void
): FocalPadHandlers => {
  const [drag, setDrag] = useState<string | null>(null);
  const point = focalOf(drag ?? value);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const move = toKeyMove(event.key, toKeyStep(event.shiftKey));

      if (!move) {
        return;
      }

      event.preventDefault();
      onPick(focalText(point.x + move[0], point.y + move[1]));
    },
    [onPick, point.x, point.y]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (isDisabled) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag(toFocalAt(event, event.currentTarget.getBoundingClientRect()));
    },
    [isDisabled]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (drag !== null) {
        setDrag(toFocalAt(event, event.currentTarget.getBoundingClientRect()));
      }
    },
    [drag]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (drag === null) {
        return;
      }

      const next = toFocalAt(
        event,
        event.currentTarget.getBoundingClientRect()
      );

      setDrag(null);
      onPick(next);
    },
    [drag, onPick]
  );

  const handlePointerCancel = useCallback((): void => setDrag(null), []);

  return {
    handleKeyDown,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    point,
  };
};

export { useFocalPad };
