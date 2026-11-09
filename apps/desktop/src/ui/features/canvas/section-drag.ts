import type { PointerEvent as ReactPointerEvent } from "react";

interface SectionDelta {
  readonly x: number;
  readonly y: number;
}

type SectionDeltaHandler = (delta: SectionDelta, isFinal: boolean) => void;

const startSectionDrag = (
  event: ReactPointerEvent,
  zoom: number,
  onDelta: SectionDeltaHandler
): void => {
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const abort = new AbortController();
  const { signal } = abort;

  const read = (moved: PointerEvent): SectionDelta => ({
    x: (moved.clientX - startX) / zoom,
    y: (moved.clientY - startY) / zoom,
  });

  const end = (ended: PointerEvent): void => {
    abort.abort();
    onDelta(read(ended), true);
  };

  globalThis.addEventListener(
    "pointermove",
    (moved) => onDelta(read(moved), false),
    {
      signal,
    }
  );
  globalThis.addEventListener("pointerup", end, { signal });
  globalThis.addEventListener("pointercancel", end, { signal });
};

export { startSectionDrag };

export type { SectionDelta };
