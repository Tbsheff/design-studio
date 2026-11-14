import type { PointerEvent as ReactPointerEvent } from "react";

interface SectionDelta {
  readonly x: number;
  readonly y: number;
}

interface SectionPointer {
  readonly clientX: number;
  readonly clientY: number;
  readonly shiftKey: boolean;
}

type SectionDeltaHandler = (delta: SectionDelta, isFinal: boolean) => void;

const toLockedDelta = (
  delta: SectionDelta,
  isLocked: boolean
): SectionDelta => {
  if (!isLocked) {
    return delta;
  }

  if (Math.abs(delta.x) >= Math.abs(delta.y)) {
    return { x: delta.x, y: 0 };
  }

  return { x: 0, y: delta.y };
};

const startSectionDrag = (
  event: ReactPointerEvent<HTMLElement>,
  zoom: number,
  onDelta: SectionDeltaHandler,
  canLock: boolean
): void => {
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startY = event.clientY;
  const abort = new AbortController();
  const { signal } = abort;
  let last: SectionPointer | null = null;

  const read = (moved: SectionPointer): SectionDelta =>
    toLockedDelta(
      {
        x: (moved.clientX - startX) / zoom,
        y: (moved.clientY - startY) / zoom,
      },
      canLock && moved.shiftKey
    );

  const end = (ended: Event): void => {
    abort.abort();

    if (ended instanceof PointerEvent) {
      onDelta(read(ended), true);
    }
  };

  const onShift = (keyEvent: KeyboardEvent): void => {
    if (keyEvent.key !== "Shift" || last === null || keyEvent.repeat) {
      return;
    }

    last = {
      clientX: last.clientX,
      clientY: last.clientY,
      shiftKey: keyEvent.type === "keydown",
    };
    onDelta(read(last), false);
  };

  target.addEventListener(
    "pointermove",
    (moved) => {
      if (moved instanceof PointerEvent) {
        last = moved;
        onDelta(read(moved), false);
      }
    },
    { signal }
  );
  target.addEventListener("pointerup", end, { signal });
  target.addEventListener("pointercancel", end, { signal });
  globalThis.addEventListener("keydown", onShift, { signal });
  globalThis.addEventListener("keyup", onShift, { signal });
};

export { startSectionDrag };

export type { SectionDelta };
