import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import {
  activeFrame,
  RESIZE_MIN,
  resizeFrame,
  viewportOf,
  shownFrames,
} from "./canvas-frame-ops.js";
import type { Box, CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { snapOff, snapRect } from "./snap-model.js";
import type { SnapGuide, SpacingBadge } from "./snap-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

const MAX_SIDE = 4000;

interface FrameSnapView {
  guides: SnapGuide[];
  spacing: SpacingBadge[];
  shift: { x: number; y: number };
}

const EMPTY_SNAP: FrameSnapView = {
  guides: [],
  shift: { x: 0, y: 0 },
  spacing: [],
};

const createSnapStore = (): {
  get: () => FrameSnapView;
  set: (next: FrameSnapView | null) => void;
  subscribe: (fn: () => void) => () => boolean;
} => {
  let view = EMPTY_SNAP;
  const subs = new Set<() => void>();

  return {
    get: () => view,
    set: (next: FrameSnapView | null) => {
      view = next ?? EMPTY_SNAP;

      for (const fn of subs) {
        fn();
      }
    },
    subscribe: (fn: () => void) => {
      subs.add(fn);

      return (): boolean => subs.delete(fn);
    },
  };
};

const frameSnapStore = createSnapStore();

const otherFrames = (layout: CanvasLayout, id: string): Box[] =>
  shownFrames(layout).filter((canvasFrame) => canvasFrame.id !== id);

const resizedSize = (
  start: { width: number; height: number },
  edge: ResizeEdge,
  dx: number,
  dy: number,
  keepRatio: boolean
): { width: number; height: number } => {
  const clamp = (value: number): number =>
    Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, value)));

  let width: number = start.width + dx;

  if (edge === "bottom") {
    width = start.width;
  }

  let height: number = start.height + dy;

  if (edge === "right") {
    height = start.height;
  }

  if (keepRatio) {
    const ratio = start.width / start.height;

    if (edge === "bottom") {
      width = height * ratio;
    } else if (edge === "right") {
      height = width / ratio;
    } else if (Math.abs(dx) * start.height >= Math.abs(dy) * start.width) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }

    const scale = Math.max(1, RESIZE_MIN / width, RESIZE_MIN / height);
    width *= scale;
    height *= scale;
  }

  return { height: clamp(height), width: clamp(width) };
};

const snapSize = (
  frame: CanvasFrame,
  edge: ResizeEdge,
  size: { width: number; height: number },
  candidates: Box[],
  zoom: number,
  off: boolean
): { width: number; height: number } => {
  if (off || candidates.length === 0) {
    frameSnapStore.set(null);

    return size;
  }

  let result: "end" | null = "end";

  if (edge === "bottom") {
    result = null;
  }

  let result2: "end" | null = "end";

  if (edge === "right") {
    result2 = null;
  }

  const res = snapRect({
    candidates,
    rect: { x: frame.x, y: frame.y, ...size },
    x: result,
    y: result2,
    zoom,
  });

  frameSnapStore.set({
    guides: res.guides,
    shift: { x: 0, y: 0 },
    spacing: [],
  });

  const clamp = (valueValue: number): number =>
    Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, valueValue)));

  return { height: clamp(res.rect.height), width: clamp(res.rect.width) };
};

const paintSize = (
  host: HTMLElement,
  size: { width: number; height: number } | null,
  restore: { width: string; height: string }
): void => {
  host.style.width = restore.width;

  if (size) {
    host.style.width = `${size.width}px`;
  }

  host.style.height = restore.height;

  if (size) {
    host.style.height = `${size.height}px`;
  }

  for (const frame of host.querySelectorAll<HTMLIFrameElement>(
    ":scope > iframe"
  )) {
    frame.style.width = "";

    if (size) {
      frame.style.width = `${size.width}px`;
    }

    frame.style.height = "";

    if (size) {
      frame.style.height = `${size.height}px`;
    }
  }

  const readout = host.querySelector<HTMLElement>(
    ":scope > .frame-size-readout"
  );

  if (readout) {
    readout.textContent = "";

    if (size) {
      readout.textContent = `${size.width} × ${size.height}`;
    }
  }

  host.classList.toggle("frame-resizing", size !== null);
};

const useFrameResize = (
  frames: CanvasFrames,
  pz: PanZoom,
  artboardRef: RefObject<HTMLDivElement | null>,
  passive: RefObject<Record<string, HTMLDivElement | null>>
): ((
  event: ReactPointerEvent,
  frame: CanvasFrame,
  edge: ResizeEdge
) => void) => {
  const dragging = useRef(false);

  return (
    eventValue: ReactPointerEvent,
    frame: CanvasFrame,
    edge: ResizeEdge
  ): void => {
    if (
      eventValue.button !== 0 ||
      pz.spaceHeld ||
      pz.zoomHeld ||
      dragging.current
    ) {
      return;
    }

    eventValue.preventDefault();
    eventValue.stopPropagation();

    let host: HTMLDivElement | null = passive.current?.[frame.id] ?? null;

    if (frame.id === frames.layout.activeId) {
      host = artboardRef.current;
    }

    if (!host) {
      return;
    }

    pz.freeze();
    const target = eventValue.currentTarget as HTMLElement;
    target.setPointerCapture(eventValue.pointerId);
    dragging.current = true;
    const { zoom } = pz;
    const startX = eventValue.clientX;
    const startY = eventValue.clientY;
    const start = { height: frame.height, width: frame.width };
    let size = start;
    let shift = eventValue.shiftKey;
    let off = snapOff(eventValue);
    const candidates = otherFrames(frames.layout, frame.id);
    let last = { x: startX, y: startY };
    const restore = { height: host.style.height, width: host.style.width };
    document.body.classList.add(`frame-resize-${edge}`);

    const place = (): void => {
      size = snapSize(
        frame,
        edge,
        resizedSize(
          start,
          edge,
          (last.x - startX) / zoom,
          (last.y - startY) / zoom,
          shift
        ),
        candidates,
        zoom,
        shift || off
      );
      paintSize(host, size, restore);
    };

    place();

    const move = (ev: PointerEvent): void => {
      last = { x: ev.clientX, y: ev.clientY };
      shift = ev.shiftKey;
      off = snapOff(ev);
      place();
    };

    const key = (ev: KeyboardEvent): void => {
      if (ev.key !== "Shift") {
        return;
      }

      shift = ev.type === "keydown";
      place();
    };

    const end = (): void => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      globalThis.removeEventListener("keydown", key);
      globalThis.removeEventListener("keyup", key);
      document.body.classList.remove(`frame-resize-${edge}`);
      dragging.current = false;
      frameSnapStore.set(null);
      paintSize(host, null, restore);

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

    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
    globalThis.addEventListener("keydown", key);
    globalThis.addEventListener("keyup", key);
  };
};

export { frameSnapStore, otherFrames, resizedSize, useFrameResize };

export type { FrameSnapView };
