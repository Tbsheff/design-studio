type MoveLock = "x" | "y" | null;

interface LockedDrag {
  readonly dx: number;
  readonly dy: number;
  readonly lock: MoveLock;
}

interface PointerSample {
  readonly altKey: boolean;
  readonly buttons: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly pointerId: number;
}

const toKept = (value: number, isKept: boolean): number => {
  if (isKept) {
    return value;
  }

  return 0;
};

const toLock = (isRow: boolean): MoveLock => {
  if (isRow) {
    return "x";
  }

  return "y";
};

const toLockedDrag = (
  dx: number,
  dy: number,
  isShiftHeld: boolean
): LockedDrag => {
  if (!isShiftHeld) {
    return { dx, dy, lock: null };
  }

  const isRow = Math.abs(dx) >= Math.abs(dy);

  return {
    dx: toKept(dx, isRow),
    dy: toKept(dy, !isRow),
    lock: toLock(isRow),
  };
};

const toSample = (event: PointerEvent): PointerSample => ({
  altKey: event.altKey,
  buttons: event.buttons,
  clientX: event.clientX,
  clientY: event.clientY,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  pointerId: event.pointerId,
});

const toRepeatEvent = (
  sample: PointerSample,
  isShiftHeld: boolean
): PointerEvent =>
  new PointerEvent("pointermove", { ...sample, shiftKey: isShiftHeld });

const installShiftRepeat = (move: (event: PointerEvent) => boolean): void => {
  let sample: PointerSample | null = null;

  const onPointer = (event: PointerEvent): void => {
    sample = toSample(event);
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Shift" || sample === null || event.repeat) {
      return;
    }

    if (sample.buttons % 2 === 0) {
      return;
    }

    move(toRepeatEvent(sample, event.type === "keydown"));
  };

  globalThis.addEventListener("pointermove", onPointer, { capture: true });
  globalThis.addEventListener("pointerup", onPointer, { capture: true });
  globalThis.addEventListener("keydown", onKey, { capture: true });
  globalThis.addEventListener("keyup", onKey, { capture: true });
};

export { installShiftRepeat, toLockedDrag };

export type { LockedDrag, MoveLock };
