import type { PointerEvent as ReactPointerEvent } from "react";

interface SectionDelta {
  readonly x: number;
  readonly y: number;
}

type SectionDeltaHandler = (delta: SectionDelta, isFinal: boolean) => void;

const startSectionDrag = (
  event: ReactPointerEvent<HTMLElement>,
  zoom: number,
  onDelta: SectionDeltaHandler
): void => {
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startY = event.clientY;
  const abort = new AbortController();
  const { signal } = abort;

  const read = (moved: PointerEvent): SectionDelta => ({
    x: (moved.clientX - startX) / zoom,
    y: (moved.clientY - startY) / zoom,
  });

  const end = (ended: Event): void => {
    abort.abort();

    if (ended instanceof PointerEvent) {
      onDelta(read(ended), true);
    }
  };

  target.addEventListener(
    "pointermove",
    (moved) => {
      if (moved instanceof PointerEvent) {
        onDelta(read(moved), false);
      }
    },
    { signal }
  );
  target.addEventListener("pointerup", end, { signal });
  target.addEventListener("pointercancel", end, { signal });
};

export { startSectionDrag };

export type { SectionDelta };
