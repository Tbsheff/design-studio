import type { RefObject } from "react";

const TOUCH_SLOP = 2;
const UP_KEYS = new Set(["ArrowUp", "Home", "PageUp"]);

const listenForKeys = (
  viewport: HTMLElement,
  wasAtBottomRef: RefObject<boolean>
): (() => void) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    const isSpaceUp = event.key === " " && event.shiftKey;

    if (UP_KEYS.has(event.key) || isSpaceUp) {
      wasAtBottomRef.current = false;
    }
  };

  viewport.addEventListener("keydown", onKeyDown);

  return (): void => viewport.removeEventListener("keydown", onKeyDown);
};

const listenForWheel = (
  viewport: HTMLElement,
  wasAtBottomRef: RefObject<boolean>
): (() => void) => {
  const onWheel = (event: WheelEvent): void => {
    if (event.deltaY < 0) {
      wasAtBottomRef.current = false;
    }
  };

  viewport.addEventListener("wheel", onWheel, { passive: true });

  return (): void => viewport.removeEventListener("wheel", onWheel);
};

const listenForTouch = (
  viewport: HTMLElement,
  wasAtBottomRef: RefObject<boolean>
): (() => void) => {
  let touchY: number | null = null;

  const onTouchStart = (event: TouchEvent): void => {
    touchY = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: TouchEvent): void => {
    const next = event.touches[0]?.clientY ?? null;

    if (next !== null && touchY !== null && next > touchY + TOUCH_SLOP) {
      wasAtBottomRef.current = false;
    }

    touchY = next;
  };

  viewport.addEventListener("touchstart", onTouchStart, { passive: true });
  viewport.addEventListener("touchmove", onTouchMove, { passive: true });

  return (): void => {
    viewport.removeEventListener("touchstart", onTouchStart);
    viewport.removeEventListener("touchmove", onTouchMove);
  };
};

const listenForDrag = (
  viewport: HTMLElement,
  draggingRef: RefObject<boolean>
): (() => void) => {
  const release = (): void => {
    draggingRef.current = false;
    globalThis.removeEventListener("pointerup", release);
    globalThis.removeEventListener("pointercancel", release);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.target !== event.currentTarget) {
      return;
    }

    draggingRef.current = true;
    globalThis.addEventListener("pointerup", release);
    globalThis.addEventListener("pointercancel", release);
  };

  viewport.addEventListener("pointerdown", onPointerDown);

  return (): void => {
    viewport.removeEventListener("pointerdown", onPointerDown);
    release();
  };
};

const listenForManualScroll = (
  viewport: HTMLElement,
  wasAtBottomRef: RefObject<boolean>,
  draggingRef: RefObject<boolean>
): (() => void) => {
  const stops = [
    listenForKeys(viewport, wasAtBottomRef),
    listenForWheel(viewport, wasAtBottomRef),
    listenForTouch(viewport, wasAtBottomRef),
    listenForDrag(viewport, draggingRef),
  ];

  return (): void => {
    for (const stop of stops) {
      stop();
    }
  };
};

export { listenForManualScroll };
