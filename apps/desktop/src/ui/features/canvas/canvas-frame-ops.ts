import {
  CANVAS_MAX_FRAMES,
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_SIDE,
  cleanFramePath,
} from "@design-studio/contracts/canvas-file";

import type { Viewport } from "../../platform/storage.js";
import type {
  CanvasFrame,
  CanvasLayout,
  Box,
  FramePreset,
} from "./canvas-frames-model.js";
import { toPosition } from "./snap-model.js";

const FRAME_PRESETS: FramePreset[] = [
  { height: 900, label: "Desktop 1440", preset: "desktop", width: 1440 },
  { height: 1024, label: "Tablet 768", preset: "tablet", width: 768 },
  { height: 844, label: "Mobile 390", preset: "mobile", width: 390 },
];

const FRAME_GAP = 80;

const MAX_FRAMES = CANVAS_MAX_FRAMES;

const RESIZE_MIN = 240;

const ROW_GAP = FRAME_GAP * 2;

const frameName = (frame: Pick<CanvasFrame, "width" | "height">): string => {
  const preset = FRAME_PRESETS.find(
    (framePreset) =>
      framePreset.width === frame.width && framePreset.height === frame.height
  );

  if (preset) {
    return preset.label;
  }

  return `${frame.width} × ${frame.height}`;
};

const viewportOf = (frame: Pick<CanvasFrame, "width" | "height">): Viewport => {
  const preset = FRAME_PRESETS.find(
    (framePreset) =>
      framePreset.width === frame.width && framePreset.height === frame.height
  );

  return {
    height: frame.height,
    preset: preset?.preset ?? "custom",
    width: frame.width,
  };
};

const defaultLayout = (viewport: Viewport): CanvasLayout => ({
  activeId: "f1",
  frames: [
    {
      height: viewport.height,
      id: "f1",
      width: viewport.width,
      ...toPosition(0, 0),
    },
  ],
});

const activeFrame = (layout: CanvasLayout): CanvasFrame =>
  layout.frames.find((canvasFrame) => canvasFrame.id === layout.activeId) ??
  (layout.frames[0] as CanvasFrame);

const shownFrames = (layout: CanvasLayout): CanvasFrame[] =>
  layout.frames.filter(
    (canvasFrame) => !canvasFrame.hidden || canvasFrame.id === layout.activeId
  );

const boundsOf = (frames: CanvasFrame[]): Box => {
  if (frames.length === 0) {
    return { height: 0, width: 0, ...toPosition(0, 0) };
  }

  const left = Math.min(...frames.map((canvasFrame2) => canvasFrame2.x));
  const top = Math.min(...frames.map((canvasFrame3) => canvasFrame3.y));

  const right = Math.max(
    ...frames.map((canvasFrame4) => canvasFrame4.x + canvasFrame4.width)
  );

  const bottom = Math.max(
    ...frames.map((canvasFrame5) => canvasFrame5.y + canvasFrame5.height)
  );

  return {
    height: bottom - top,
    width: right - left,
    ...toPosition(left, top),
  };
};

const nextId = (frames: CanvasFrame[]): string => {
  let count = frames.length + 1;

  while (frames.some((canvasFrame6) => canvasFrame6.id === `f${count}`)) {
    count += 1;
  }

  return `f${count}`;
};

const canAddFrame = (layout: CanvasLayout): boolean =>
  layout.frames.length < MAX_FRAMES;

const nextLabel = (frames: CanvasFrame[]): string => {
  let count = frames.length + 1;

  while (
    frames.some((canvasFrame7) => canvasFrame7.label === `Frame ${count}`)
  ) {
    count += 1;
  }

  return `Frame ${count}`;
};

const addFrame = (
  layout: CanvasLayout,
  size: { width: number; height: number }
): CanvasLayout => {
  if (!canAddFrame(layout)) {
    return layout;
  }

  const bounds = boundsOf(shownFrames(layout));

  const frame: CanvasFrame = {
    height: size.height,
    id: nextId(layout.frames),
    label: nextLabel(layout.frames),
    width: size.width,
    ...toPosition(bounds.x + bounds.width + FRAME_GAP, bounds.y),
  };

  return { ...layout, frames: [...layout.frames, frame] };
};

const moveFrame = (
  layout: CanvasLayout,
  id: string,
  dx: number,
  dy: number
): CanvasLayout => {
  if (dx === 0 && dy === 0) {
    return layout;
  }

  return {
    ...layout,
    frames: layout.frames.map((canvasFrame8) => {
      if (canvasFrame8.id === id) {
        return {
          ...canvasFrame8,
          ...toPosition(
            Math.round(canvasFrame8.x + dx),
            Math.round(canvasFrame8.y + dy)
          ),
        };
      }

      return canvasFrame8;
    }),
  };
};

const firstShown = (frames: CanvasFrame[]): CanvasFrame =>
  frames.find((canvasFrame9) => !canvasFrame9.hidden) ??
  (frames[0] as CanvasFrame);

const removeFrame = (layout: CanvasLayout, id: string): CanvasLayout => {
  if (layout.frames.length <= 1) {
    return layout;
  }

  const frames = layout.frames.filter(
    (canvasFrame10) => canvasFrame10.id !== id
  );

  let activeId: string = layout.activeId;

  if (layout.activeId === id) {
    activeId = firstShown(frames).id;
  }

  return { activeId, frames };
};

const canHideFrame = (layout: CanvasLayout, id: string): boolean =>
  shownFrames(layout).some((canvasFrame11) => canvasFrame11.id !== id);

const withoutKey = <Key extends "path" | "directionId" | "hidden">(
  frame: CanvasFrame,
  key: Key
): CanvasFrame => {
  const kept = Object.entries(frame).filter(([name]) => name !== key);

  return Object.fromEntries(kept) as CanvasFrame;
};

const setFrameHidden = (
  layout: CanvasLayout,
  id: string,
  hidden: boolean
): CanvasLayout => {
  const frame = layout.frames.find((canvasFrame12) => canvasFrame12.id === id);

  if (
    !frame ||
    Boolean(frame.hidden) === hidden ||
    (hidden && !canHideFrame(layout, id))
  ) {
    return layout;
  }

  const frames = layout.frames.map((canvasFrame13) => {
    if (canvasFrame13.id === id) {
      if (hidden) {
        return { ...canvasFrame13, hidden: true };
      }

      return withoutKey(canvasFrame13, "hidden");
    }

    return canvasFrame13;
  });

  let activeId: string = layout.activeId;

  if (hidden && layout.activeId === id) {
    activeId = firstShown(frames).id;
  }

  return { activeId, frames };
};

const resizeFrame = (
  layout: CanvasLayout,
  id: string,
  width: number,
  height: number
): CanvasLayout => {
  const width2 = Math.round(
    Math.min(CANVAS_MAX_SIDE, Math.max(RESIZE_MIN, width))
  );

  const height2 = Math.round(
    Math.min(CANVAS_MAX_HEIGHT, Math.max(RESIZE_MIN, height))
  );

  const frame = layout.frames.find((canvasFrame14) => canvasFrame14.id === id);

  if (!frame || (frame.width === width2 && frame.height === height2)) {
    return layout;
  }

  return {
    ...layout,
    frames: layout.frames.map((canvasFrame15) => {
      if (canvasFrame15.id === id) {
        return { ...canvasFrame15, height: height2, width: width2 };
      }

      return canvasFrame15;
    }),
  };
};

const setFramePath = (
  layout: CanvasLayout,
  id: string,
  raw: string
): CanvasLayout => {
  const path = cleanFramePath(raw);
  const frame = layout.frames.find((canvasFrame16) => canvasFrame16.id === id);

  if (path === null || !frame || (frame.path ?? "") === path) {
    return layout;
  }

  return {
    ...layout,
    frames: layout.frames.map((canvasFrame17) => {
      if (canvasFrame17.id === id) {
        if (path) {
          return { ...canvasFrame17, path };
        }

        return withoutKey(canvasFrame17, "path");
      }

      return canvasFrame17;
    }),
  };
};

const withFramePath = (url: string, path: string | undefined): string => {
  if (!path) {
    return url;
  }

  const base = new URL(url, globalThis.location?.href);

  if (!base.pathname.endsWith("/")) {
    base.pathname = base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1);
  }

  const next = new URL(path, base);
  next.search = base.search;

  return next.toString();
};

const resizeActive = (
  layout: CanvasLayout,
  width: number,
  height: number
): CanvasLayout => {
  const active = activeFrame(layout);

  if (active.width === width && active.height === height) {
    return layout;
  }

  return {
    ...layout,
    frames: layout.frames.map((canvasFrame18) => {
      if (canvasFrame18.id === active.id) {
        return { ...canvasFrame18, height, width };
      }

      return canvasFrame18;
    }),
  };
};

export {
  FRAME_GAP,
  FRAME_PRESETS,
  MAX_FRAMES,
  RESIZE_MIN,
  ROW_GAP,
  activeFrame,
  addFrame,
  boundsOf,
  canAddFrame,
  canHideFrame,
  defaultLayout,
  firstShown,
  frameName,
  moveFrame,
  nextId,
  removeFrame,
  resizeActive,
  resizeFrame,
  setFrameHidden,
  setFramePath,
  shownFrames,
  viewportOf,
  withFramePath,
  withoutKey,
};
