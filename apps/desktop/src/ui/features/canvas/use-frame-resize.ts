import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { startResizeDrag } from "./frame-resize-drag.js";
import type { ResizeEdge } from "./resize-edge-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { PanZoom } from "./use-pan-zoom.js";

type ResizeStart = (
  event: ReactPointerEvent,
  frame: CanvasFrame,
  edge: ResizeEdge
) => void;

const toResizeHost = (
  frames: CanvasFrames,
  artboardRef: RefObject<HTMLDivElement | null>,
  passive: RefObject<Record<string, HTMLDivElement | null>>,
  frame: CanvasFrame
): HTMLDivElement | null => {
  if (frame.id === frames.layout.activeId) {
    return artboardRef.current;
  }

  return passive.current?.[frame.id] ?? null;
};

const useFrameResize = (
  frames: CanvasFrames,
  pz: PanZoom,
  artboardRef: RefObject<HTMLDivElement | null>,
  passive: RefObject<Record<string, HTMLDivElement | null>>
): ResizeStart => {
  const dragging = useRef(false);

  return (event, frame, edge): void => {
    if (event.button !== 0 || pz.spaceHeld || pz.zoomHeld || dragging.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const host = toResizeHost(frames, artboardRef, passive, frame);

    if (!host) {
      return;
    }

    pz.freeze();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    dragging.current = true;

    const { zoom } = pz;

    const onEnd = (): void => {
      dragging.current = false;
    };

    startResizeDrag({ edge, event, frame, frames, host, onEnd, target, zoom });
  };
};

export { useFrameResize };

export type { ResizeStart };
