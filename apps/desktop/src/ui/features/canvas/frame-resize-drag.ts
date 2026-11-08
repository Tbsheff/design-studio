import type { PointerEvent as ReactPointerEvent } from "react";

import { uiStore } from "../../platform/storage.js";
import { activeFrame, resizeFrame, viewportOf } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { otherFrames, resizedSize, snapSize } from "./frame-resize-model.js";
import type { Size } from "./frame-resize-model.js";
import { paintSize } from "./frame-resize-paint.js";
import type { SideStyle } from "./frame-resize-paint.js";
import { frameSnapStore } from "./frame-snap-store.js";
import type { ResizeEdge } from "./resize-edge-model.js";
import { snapOff } from "./snap-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";

interface DragInit {
  readonly frames: CanvasFrames;
  readonly zoom: number;
  readonly frame: CanvasFrame;
  readonly edge: ResizeEdge;
  readonly host: HTMLElement;
  readonly target: HTMLElement;
  readonly event: ReactPointerEvent;
  readonly onEnd: () => void;
}

interface DragState {
  last: { x: number; y: number };
  isOff: boolean;
  hasShift: boolean;
  size: Size;
}

const commitResize = (
  frames: CanvasFrames,
  frame: CanvasFrame,
  size: Size,
  start: Size
): void => {
  if (size.width === start.width && size.height === start.height) {
    return;
  }

  frames.update((canvasLayout) =>
    resizeFrame(canvasLayout, frame.id, size.width, size.height)
  );

  if (frame.id === frames.layout.activeId) {
    const next = activeFrame(
      resizeFrame(frames.layout, frame.id, size.width, size.height)
    );

    uiStore.set({ viewport: viewportOf(next) });
  }
};

const startResizeDrag = (init: DragInit): void => {
  const { frames, zoom, frame, edge, host, target, event } = init;
  const startX = event.clientX;
  const startY = event.clientY;
  const start = { height: frame.height, width: frame.width };
  const candidates = otherFrames(frames.layout, frame.id);

  const restore: SideStyle = {
    height: host.style.height,
    width: host.style.width,
  };

  const state: DragState = {
    hasShift: event.shiftKey,
    isOff: snapOff(event),
    last: { x: startX, y: startY },
    size: start,
  };

  const bodyClass = `frame-resize-${edge}`;

  document.body.classList.add(bodyClass);

  const place = (): void => {
    const delta = {
      dx: (state.last.x - startX) / zoom,
      dy: (state.last.y - startY) / zoom,
      keepRatio: state.hasShift,
    };

    const isOff = state.hasShift || state.isOff;

    const snapped = snapSize(frame, edge, resizedSize(start, edge, delta), {
      candidates,
      isOff,
      zoom,
    });

    state.size = snapped.size;
    frameSnapStore.set(snapped.view);
    paintSize(host, state.size, restore);
  };

  place();

  const move = (ev: PointerEvent): void => {
    state.last = { x: ev.clientX, y: ev.clientY };
    state.hasShift = ev.shiftKey;
    state.isOff = snapOff(ev);
    place();
  };

  const key = (ev: KeyboardEvent): void => {
    if (ev.key === "Shift") {
      state.hasShift = ev.type === "keydown";
      place();
    }
  };

  const end = (): void => {
    target.removeEventListener("pointermove", move as EventListener);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    globalThis.removeEventListener("keydown", key);
    globalThis.removeEventListener("keyup", key);
    document.body.classList.remove(bodyClass);
    init.onEnd();
    frameSnapStore.set(null);
    paintSize(host, null, restore);
    commitResize(frames, frame, state.size, start);
  };

  target.addEventListener("pointermove", move as EventListener);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
  globalThis.addEventListener("keydown", key);
  globalThis.addEventListener("keyup", key);
};

export { startResizeDrag };
