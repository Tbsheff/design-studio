import {
  activeFrame,
  boundsOf,
  FRAME_GAP,
  MAX_FRAMES,
  nextId,
  ROW_GAP,
} from "./canvas-frame-ops.js";
import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import { toPosition } from "./snap-model.js";

interface RowOrigin {
  readonly left: number;
  readonly top: number;
}

const frameDirection = (
  frame: CanvasFrame,
  currentId: string | null
): string | null => frame.directionId ?? currentId;

const pickActiveId = (frames: CanvasFrame[], preferred: string): string => {
  if (frames.some((frame) => frame.id === preferred)) {
    return preferred;
  }

  return (frames[0] as CanvasFrame).id;
};

const assignDirection = (
  frames: CanvasFrame[],
  currentId: string | null
): CanvasFrame[] =>
  frames.map((frame) => {
    if (frame.directionId || !currentId) {
      return frame;
    }

    return { ...frame, directionId: currentId };
  });

const toRowOrigin = (
  group: CanvasFrame[],
  others: CanvasFrame[]
): RowOrigin => {
  const rest = boundsOf(others);

  if (group.length > 0) {
    const row = boundsOf(group);

    return { left: row.x + row.width + FRAME_GAP, top: row.y };
  }

  if (others.length > 0) {
    return { left: rest.x, top: rest.y + rest.height + ROW_GAP };
  }

  return { left: rest.x, top: 0 };
};

const appendMissing = (
  frames: CanvasFrame[],
  missing: string[],
  size: CanvasFrame,
  origin: RowOrigin
): CanvasFrame[] => {
  const next = [...frames];
  let { left } = origin;

  for (const id of missing) {
    if (next.length >= MAX_FRAMES) {
      break;
    }

    next.push({
      directionId: id,
      height: size.height,
      id: nextId(next),
      width: size.width,
      ...toPosition(left, origin.top),
    });
    left += size.width + FRAME_GAP;
  }

  return next;
};

const placeDirections = (
  layout: CanvasLayout,
  directionIds: string[],
  currentId: string | null,
  dropCurrent: boolean
): CanvasLayout => {
  const wanted = new Set(directionIds);
  let frames = assignDirection(layout.frames, currentId);

  if (dropCurrent && currentId && !wanted.has(currentId)) {
    frames = frames.filter((frame) => frame.directionId !== currentId);
  }

  const present = new Set(frames.map((frame) => frame.directionId));
  const missing = directionIds.filter((id) => !present.has(id));

  const group = frames.filter(
    (frame) => frame.directionId && wanted.has(frame.directionId)
  );

  const grouped = new Set(group);
  const others = frames.filter((frame) => !grouped.has(frame) && !frame.hidden);
  const origin = toRowOrigin(group, others);
  const next = appendMissing(frames, missing, activeFrame(layout), origin);

  if (next.length === 0) {
    return layout;
  }

  return { activeId: pickActiveId(next, layout.activeId), frames: next };
};

const keepDirection = (
  layout: CanvasLayout,
  keepId: string,
  groupIds: string[]
): CanvasLayout => {
  const grouped = new Set(groupIds);

  const frames = layout.frames.filter(
    (frame) =>
      !frame.directionId ||
      frame.directionId === keepId ||
      !grouped.has(frame.directionId)
  );

  const kept = frames.find((frame) => frame.directionId === keepId);

  if (frames.length === 0) {
    return layout;
  }

  const activeId = kept?.id ?? pickActiveId(frames, layout.activeId);

  if (frames.length === layout.frames.length && activeId === layout.activeId) {
    return layout;
  }

  return { activeId, frames };
};

const followDirection = (
  layout: CanvasLayout,
  currentId: string | null
): CanvasLayout => {
  const active = activeFrame(layout);

  if (!currentId || frameDirection(active, currentId) === currentId) {
    return layout;
  }

  const match =
    layout.frames.find(
      (frame) => frame.directionId === currentId && !frame.hidden
    ) ?? layout.frames.find((frame) => !frame.directionId && !frame.hidden);

  if (match) {
    return { ...layout, activeId: match.id };
  }

  return {
    ...layout,
    frames: layout.frames.map((frame) => {
      if (frame.id === active.id) {
        return { ...frame, directionId: currentId };
      }

      return frame;
    }),
  };
};

export { followDirection, frameDirection, keepDirection, placeDirections };
