import type { PointerEvent as ReactPointerEvent } from "react";

import type { Box, CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { otherFrames } from "./frame-resize-model.js";
import {
  toGroupFrames,
  toGroupRect,
  toOutsideFrames,
} from "./frame-selection-model.js";
import { frameSnapStore, snapLineStore } from "./frame-snap-store.js";
import { snapToGuides, toGuideMarks } from "./ruler-guide-model.js";
import { snapOff, snapRect } from "./snap-model.js";

const DRAG_THRESHOLD = 3;

interface Point {
  x: number;
  y: number;
}

interface DragGroup {
  readonly ids: ReadonlySet<string>;
  readonly hasActive: boolean;
  readonly passive: Record<string, HTMLDivElement | null>;
}

interface DragState {
  frame: Box;
  group: DragGroup | null;
  isActive: boolean;
  zoom: number;
  passive: HTMLDivElement[];
  own: HTMLDivElement | null;
}

interface DragHost {
  readonly artboard: () => HTMLDivElement | null;
  readonly group: readonly string[];
  readonly layout: CanvasLayout;
  readonly onMoved: (frame: CanvasFrame, world: Point) => void;
  readonly onTap: (frame: CanvasFrame, point: Point | null) => void;
  readonly passive: Record<string, HTMLDivElement | null>;
  readonly zoom: number;
}

interface DragProgress {
  isMoved: boolean;
  world: Point;
}

const toPointer = (
  target: HTMLElement,
  clientX: number,
  clientY: number,
  zoom: number
): Point => {
  const rect = target.getBoundingClientRect();

  return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
};

const toSnapShift = (
  isActive: boolean,
  shiftX: number,
  shiftY: number
): Point => {
  if (isActive) {
    return { x: -shiftX, y: -shiftY };
  }

  return { x: 0, y: 0 };
};

const snapMove = (
  state: DragState,
  candidates: Box[],
  delta: Point,
  isOff: boolean
): Point => {
  const lines = snapLineStore.get();

  if (isOff || (candidates.length === 0 && lines.length === 0)) {
    frameSnapStore.set(null);

    return delta;
  }

  const { frame } = state;

  const lined = snapToGuides({
    lines,
    rect: {
      height: frame.height,
      width: frame.width,
      x: frame.x + delta.x,
      y: frame.y + delta.y,
    },
    x: "move",
    y: "move",
    zoom: state.zoom,
  });

  const snapped = snapRect({
    candidates,
    rect: lined.rect,
    x: lined.x,
    y: lined.y,
    zoom: state.zoom,
  });

  const shiftX = snapped.rect.x - frame.x;
  const shiftY = snapped.rect.y - frame.y;

  const marks = toGuideMarks(snapped.rect, lines, { x: "move", y: "move" });

  frameSnapStore.set({
    guides: [...snapped.guides, ...marks],
    shift: toSnapShift(state.isActive, shiftX, shiftY),
    spacing: snapped.spacing,
  });

  return { x: shiftX, y: shiftY };
};

const toTranslate = (isClear: boolean, x: number, y: number): string => {
  if (isClear) {
    return "";
  }

  return `${x}px ${y}px`;
};

const toGroupShift = (isOn: boolean, value: number): number => {
  if (isOn) {
    return value;
  }

  return 0;
};

const toPassiveShift = (group: DragGroup, id: string, world: Point): Point => {
  const isMember = group.ids.has(id);

  return {
    x: toGroupShift(isMember, world.x) - toGroupShift(group.hasActive, world.x),
    y: toGroupShift(isMember, world.y) - toGroupShift(group.hasActive, world.y),
  };
};

const placeGroupDrag = (
  group: DragGroup,
  artboard: HTMLDivElement | null,
  world: Point,
  zoom: number
): void => {
  const isClear = world.x === 0 && world.y === 0;

  if (artboard) {
    artboard.style.translate = toTranslate(
      isClear || !group.hasActive,
      world.x * zoom,
      world.y * zoom
    );
  }

  for (const [id, element] of Object.entries(group.passive)) {
    if (element) {
      const shift = toPassiveShift(group, id, world);

      element.style.translate = toTranslate(
        shift.x === 0 && shift.y === 0,
        shift.x,
        shift.y
      );
    }
  }
};

const placeDrag = (
  state: DragState,
  artboard: HTMLDivElement | null,
  dx: number,
  dy: number
): void => {
  const worldX = dx / state.zoom;
  const worldY = dy / state.zoom;
  const isClear = dx === 0 && dy === 0;

  if (state.group) {
    placeGroupDrag(state.group, artboard, { x: worldX, y: worldY }, state.zoom);

    return;
  }

  if (!state.isActive) {
    if (state.own) {
      state.own.style.translate = toTranslate(isClear, worldX, worldY);
    }

    return;
  }

  if (artboard) {
    artboard.style.translate = toTranslate(isClear, dx, dy);
  }

  for (const element of state.passive) {
    element.style.translate = toTranslate(isClear, -worldX, -worldY);
  }
};

const toDragGroup = (host: DragHost, frame: CanvasFrame): DragGroup | null => {
  if (host.group.length < 2 || !host.group.includes(frame.id)) {
    return null;
  }

  return {
    hasActive: host.group.includes(host.layout.activeId),
    ids: new Set(host.group),
    passive: host.passive,
  };
};

const toDragBox = (host: DragHost, frame: CanvasFrame): Box => {
  if (toDragGroup(host, frame) === null) {
    return frame;
  }

  return toGroupRect(toGroupFrames(host.layout, host.group)) ?? frame;
};

const toCandidates = (host: DragHost, frame: CanvasFrame): Box[] => {
  if (toDragGroup(host, frame) === null) {
    return otherFrames(host.layout, frame.id);
  }

  return toOutsideFrames(host.layout, host.group);
};

const isActiveDrag = (host: DragHost, frame: CanvasFrame): boolean => {
  const group = toDragGroup(host, frame);

  if (group) {
    return group.hasActive;
  }

  return frame.id === host.layout.activeId;
};

const toDragState = (host: DragHost, frame: CanvasFrame): DragState => ({
  frame: toDragBox(host, frame),
  group: toDragGroup(host, frame),
  isActive: isActiveDrag(host, frame),
  own: host.passive[frame.id] ?? null,
  passive: Object.values(host.passive).filter(
    (element): element is HTMLDivElement => element !== null
  ),
  zoom: host.zoom,
});

interface DragSession {
  readonly host: DragHost;
  readonly origin: { start: Point; candidates: Box[] };
  readonly progress: DragProgress;
  readonly state: DragState;
}

const moveFrameDrag = (session: DragSession, event: PointerEvent): void => {
  const { host, origin, progress, state } = session;
  const dx = event.clientX - origin.start.x;
  const dy = event.clientY - origin.start.y;

  if (!progress.isMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
    return;
  }

  if (!progress.isMoved) {
    document.body.classList.add("frame-dragging");
  }

  progress.isMoved = true;
  progress.world = snapMove(
    state,
    origin.candidates,
    { x: dx / state.zoom, y: dy / state.zoom },
    snapOff(event)
  );
  placeDrag(
    state,
    host.artboard(),
    progress.world.x * state.zoom,
    progress.world.y * state.zoom
  );
};

const startFrameDrag = (
  host: DragHost,
  event: ReactPointerEvent,
  frame: CanvasFrame,
  point: Point | null
): void => {
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  const state = toDragState(host, frame);
  const abort = new AbortController();
  const { signal } = abort;
  const progress: DragProgress = { isMoved: false, world: { x: 0, y: 0 } };

  const origin = {
    candidates: toCandidates(host, frame),
    start: { x: event.clientX, y: event.clientY },
  };

  const end = (): void => {
    abort.abort();
    document.body.classList.remove("frame-dragging");
    frameSnapStore.set(null);
    placeDrag(state, host.artboard(), 0, 0);

    if (progress.isMoved) {
      host.onMoved(frame, progress.world);

      return;
    }

    host.onTap(frame, point);
  };

  target.addEventListener(
    "pointermove",
    (moveEvent) => {
      if (moveEvent instanceof PointerEvent) {
        moveFrameDrag({ host, origin, progress, state }, moveEvent);
      }
    },
    { signal }
  );
  target.addEventListener("pointerup", end, { signal });
  target.addEventListener("pointercancel", end, { signal });
};

export { startFrameDrag, toPointer };

export type { DragHost, Point };
