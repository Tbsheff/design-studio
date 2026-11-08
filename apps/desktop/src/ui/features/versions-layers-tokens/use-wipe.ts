import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { clampPct, toWipeStep } from "./compare-wipe-model.js";

const WIPE_START = 50;
const PERCENT_SCALE = 100;
const PRIMARY_BUTTON = 0;

interface WipeApi {
  readonly board: RefObject<HTMLDivElement | null>;
  readonly dragging: boolean;
  readonly handle: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: () => void;
  readonly pos: number;
}

const useWipe = (): WipeApi => {
  const [pos, setPos] = useState(WIPE_START);
  const [dragging, setDragging] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);

  const fromPointer = useCallback((clientX: number): void => {
    const rect = board.current?.getBoundingClientRect();

    if (rect && rect.width > 0) {
      setPos(clampPct(((clientX - rect.left) / rect.width) * PERCENT_SCALE));
    }
  }, []);

  const onPointerCancel = useCallback((): void => {
    setDragging(false);
  }, []);

  const onPointerUp = onPointerCancel;

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (event.button !== PRIMARY_BUTTON) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      fromPointer(event.clientX);
      handle.current?.focus({ preventScroll: true });
    },
    [fromPointer]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (dragging) {
        fromPointer(event.clientX);
      }
    },
    [dragging, fromPointer]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (toWipeStep(event.key, 0, false) === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPos((current) =>
        clampPct(toWipeStep(event.key, current, event.shiftKey) ?? current)
      );
    },
    []
  );

  return {
    board,
    dragging,
    handle,
    onKeyDown,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    pos,
  };
};

export { useWipe };

export type { WipeApi };
