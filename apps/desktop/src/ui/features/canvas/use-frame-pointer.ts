import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { moveFrame } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { startFrameDrag, toPointer } from "./frame-drag.js";
import type { Point } from "./frame-drag.js";
import type { CanvasFrames } from "./use-canvas-frames.js";
import type { ClickThrough } from "./use-click-through.js";
import type { PanZoom } from "./use-pan-zoom.js";

const TITLE_DOUBLE_MS = 400;

interface FramePointer {
  onFramePointerDown: (
    event: ReactPointerEvent,
    frame: CanvasFrame,
    isBody: boolean
  ) => void;
  onTitlePointerDown: (event: ReactPointerEvent, frame: CanvasFrame) => void;
}

interface FramePointerInput {
  readonly artboardRef: RefObject<HTMLDivElement | null>;
  readonly clickThrough: ClickThrough | null;
  readonly frames: CanvasFrames;
  readonly passiveRefs: RefObject<Record<string, HTMLDivElement | null>>;
  readonly pz: PanZoom;
}

interface LastTitle {
  id: string;
  at: number;
}

const isDoubleTitle = (
  event: ReactPointerEvent,
  last: LastTitle | null,
  frame: CanvasFrame,
  now: number
): boolean =>
  event.button === 0 &&
  last !== null &&
  last.id === frame.id &&
  now - last.at <= TITLE_DOUBLE_MS;

const useFramePointer = ({
  artboardRef,
  clickThrough,
  frames,
  passiveRefs,
  pz,
}: FramePointerInput): FramePointer => {
  const lastTitle = useRef<LastTitle | null>(null);

  const onFramePointerDown = (
    event: ReactPointerEvent,
    frame: CanvasFrame,
    isBody: boolean
  ): void => {
    if (event.button !== 0 || pz.spaceHeld || pz.zoomHeld) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    let point: Point | null = null;

    if (isBody && event.currentTarget instanceof HTMLElement) {
      point = toPointer(
        event.currentTarget,
        event.clientX,
        event.clientY,
        pz.zoom
      );
    }

    startFrameDrag(
      {
        artboard: () => artboardRef.current,
        layout: frames.layout,
        onMoved: (moved, world) => {
          pz.freeze();
          frames.update((layout) =>
            moveFrame(layout, moved.id, world.x, world.y)
          );
        },
        onTap: (tapped, tapPoint) => {
          frames.activate(tapped);

          if (tapPoint) {
            clickThrough?.(tapPoint);
          }
        },
        passive: passiveRefs.current,
        zoom: pz.zoom,
      },
      event,
      frame,
      point
    );
  };

  const onTitlePointerDown = (
    event: ReactPointerEvent,
    frame: CanvasFrame
  ): void => {
    const last = lastTitle.current;
    const now = performance.now();
    lastTitle.current = { at: now, id: frame.id };

    if (!isDoubleTitle(event, last, frame, now)) {
      onFramePointerDown(event, frame, false);

      return;
    }

    event.preventDefault();
    event.stopPropagation();
    lastTitle.current = null;
    frames.activate(frame);
    pz.zoomToActive();
  };

  return { onFramePointerDown, onTitlePointerDown };
};

export { useFramePointer };

export type { FramePointer };
