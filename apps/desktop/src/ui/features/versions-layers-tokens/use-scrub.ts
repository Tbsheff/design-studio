import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";

import { parseNumber } from "./token-number.js";
import { toStepped } from "./token-stepping.js";

interface ScrubStart {
  readonly startX: number;
  readonly value: string;
}

interface ScrubHandlers {
  readonly handlePointerCancel: (event: PointerEvent<HTMLElement>) => void;
  readonly handlePointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly handlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly handlePointerUp: (event: PointerEvent<HTMLElement>) => void;
}

const SCRUB_PX_PER_STEP = 2;

const useScrub = (
  value: string,
  onChange: (next: string) => void
): ScrubHandlers => {
  const start = useRef<ScrubStart | null>(null);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (event.button !== 0 || !parseNumber(value)) {
        return;
      }

      event.preventDefault();
      start.current = { startX: event.clientX, value };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [value]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      const origin = start.current;

      if (!origin) {
        return;
      }

      const next = toStepped(
        origin.value,
        Math.round((event.clientX - origin.startX) / SCRUB_PX_PER_STEP),
        event.shiftKey
      );

      if (next) {
        onChange(next);
      }
    },
    [onChange]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      start.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  return {
    handlePointerCancel: handlePointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};

export { useScrub };
