import { firstShown, shownFrames } from "./canvas-frame-ops.js";
import type { Box, CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";

const GROUP_MIN = 2;

interface Point {
  readonly x: number;
  readonly y: number;
}

const toToggledIds = (
  ids: readonly string[],
  id: string
): readonly string[] => {
  if (ids.includes(id)) {
    return ids.filter((item) => item !== id);
  }

  return [...ids, id];
};

const toMergedIds = (
  ids: readonly string[],
  added: readonly string[]
): readonly string[] => [...new Set([...ids, ...added])];

const isGroupMember = (ids: readonly string[], id: string): boolean =>
  ids.length >= GROUP_MIN && ids.includes(id);

const isTouching = (frame: Box, box: Box): boolean =>
  frame.x < box.x + box.width &&
  frame.x + frame.width > box.x &&
  frame.y < box.y + box.height &&
  frame.y + frame.height > box.y;

const toBoxIds = (layout: CanvasLayout, box: Box): readonly string[] => {
  const ids: string[] = [];

  for (const frame of shownFrames(layout)) {
    if (isTouching(frame, box)) {
      ids.push(frame.id);
    }
  }

  return ids;
};

const toBoxFromPoints = (start: Point, end: Point): Box => ({
  height: Math.abs(end.y - start.y),
  width: Math.abs(end.x - start.x),
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
});

const toGroupFrames = (
  layout: CanvasLayout,
  ids: readonly string[]
): CanvasFrame[] => {
  const picked = new Set(ids);

  return layout.frames.filter((frame) => picked.has(frame.id));
};

const toGroupRect = (frames: readonly CanvasFrame[]): Box | null => {
  if (frames.length === 0) {
    return null;
  }

  const left = Math.min(...frames.map((frame) => frame.x));
  const top = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.width));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const toOutsideFrames = (
  layout: CanvasLayout,
  ids: readonly string[]
): Box[] => {
  const picked = new Set(ids);

  return shownFrames(layout).filter((frame) => !picked.has(frame.id));
};

const toMovedFrame = (
  frame: CanvasFrame,
  dx: number,
  dy: number
): CanvasFrame => ({
  ...frame,
  x: Math.round(frame.x + dx),
  y: Math.round(frame.y + dy),
});

const toMovedLayout = (
  layout: CanvasLayout,
  ids: readonly string[],
  delta: Point
): CanvasLayout => {
  if (delta.x === 0 && delta.y === 0) {
    return layout;
  }

  const picked = new Set(ids);

  return {
    ...layout,
    frames: layout.frames.map((frame) => {
      if (!picked.has(frame.id)) {
        return frame;
      }

      return toMovedFrame(frame, delta.x, delta.y);
    }),
  };
};

const toRemovableIds = (
  layout: CanvasLayout,
  ids: readonly string[]
): readonly string[] => {
  const known = ids.filter((id) =>
    layout.frames.some((frame) => frame.id === id)
  );

  if (known.length >= layout.frames.length) {
    return known.filter((id) => id !== layout.activeId);
  }

  return known;
};

const toRemovedLayout = (
  layout: CanvasLayout,
  ids: readonly string[]
): CanvasLayout => {
  if (ids.length === 0) {
    return layout;
  }

  const picked = new Set(ids);
  const frames = layout.frames.filter((frame) => !picked.has(frame.id));

  if (frames.length === 0) {
    return layout;
  }

  const next = { activeId: layout.activeId, frames };

  if (picked.has(layout.activeId)) {
    return { ...next, activeId: firstShown(frames).id };
  }

  return next;
};

const toVisibleIds = (layout: CanvasLayout): readonly string[] =>
  shownFrames(layout).map((frame) => frame.id);

export {
  isGroupMember,
  toBoxFromPoints,
  toBoxIds,
  toGroupFrames,
  toGroupRect,
  toMergedIds,
  toMovedLayout,
  toOutsideFrames,
  toRemovableIds,
  toRemovedLayout,
  toToggledIds,
  toVisibleIds,
};

export type { Point };
