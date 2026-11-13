import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { moveFrame } from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { startFrameDrag, toPointer } from "./frame-drag.js";
import type { Point } from "./frame-drag.js";
import {
  isGroupMember,
  toMovedLayout,
  toToggledIds,
} from "./frame-selection-model.js";
import {
  clearFrameSelection,
  setSelectedIds,
  toSelectedIds,
} from "./frame-selection-store.js";
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

const MENU_BUTTON = 2;

const toDragGroupIds = (
  selected: readonly string[],
  id: string
): readonly string[] => {
  if (isGroupMember(selected, id)) {
    return selected;
  }

  return [];
};

const moveDragged = (
  layout: CanvasLayout,
  group: readonly string[],
  moved: CanvasFrame,
  world: Point
): CanvasLayout => {
  if (group.length > 0) {
    return toMovedLayout(layout, group, world);
  }

  return moveFrame(layout, moved.id, world.x, world.y);
};

const toBodyPoint = (
  event: ReactPointerEvent,
  isBody: boolean,
  zoom: number
): Point | null => {
  if (!isBody || !(event.currentTarget instanceof HTMLElement)) {
    return null;
  }

  return toPointer(event.currentTarget, event.clientX, event.clientY, zoom);
};

const hasOpenedMenu = (
  event: ReactPointerEvent,
  frame: CanvasFrame,
  isBody: boolean,
  input: Pick<FramePointerInput, "clickThrough" | "frames" | "pz">
): boolean => {
  if (
    !isBody ||
    event.button !== MENU_BUTTON ||
    !(event.currentTarget instanceof HTMLElement)
  ) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  input.frames.activate(frame);
  input.clickThrough?.(
    toPointer(event.currentTarget, event.clientX, event.clientY, input.pz.zoom),
    true
  );

  return true;
};

const hasToggledFrame = (
  event: ReactPointerEvent,
  frame: CanvasFrame,
  projectId: string
): boolean => {
  if (event.button !== 0 || !event.shiftKey) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  setSelectedIds(projectId, toToggledIds(toSelectedIds(projectId), frame.id));

  return true;
};

const tapFrame = (
  input: Pick<FramePointerInput, "clickThrough" | "frames">,
  tapped: CanvasFrame,
  tapPoint: Point | null
): void => {
  clearFrameSelection();
  input.frames.activate(tapped);

  if (tapPoint) {
    input.clickThrough?.(tapPoint, false);
  }
};

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
    if (
      hasOpenedMenu(event, frame, isBody, { clickThrough, frames, pz }) ||
      event.button !== 0 ||
      pz.spaceHeld ||
      pz.zoomHeld
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = toBodyPoint(event, isBody, pz.zoom);
    const dragGroup = toDragGroupIds(toSelectedIds(frames.projectId), frame.id);

    startFrameDrag(
      {
        artboard: () => artboardRef.current,
        group: dragGroup,
        layout: frames.layout,
        onMoved: (moved, world) => {
          pz.freeze();
          frames.update((layout) =>
            moveDragged(layout, dragGroup, moved, world)
          );
        },
        onTap: (tapped, tapPoint) =>
          tapFrame({ clickThrough, frames }, tapped, tapPoint),
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
    if (hasToggledFrame(event, frame, frames.projectId)) {
      return;
    }

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
