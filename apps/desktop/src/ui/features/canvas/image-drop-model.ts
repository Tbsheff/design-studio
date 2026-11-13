import { CANVAS_GAP } from "@design-studio/contracts/canvas-file";

import type { CanvasFrame } from "./canvas-frames-model.js";
import type { Box, Point } from "./prototype-model.js";

interface ImageDropCamera {
  readonly box: Box;
  readonly frame: CanvasFrame;
}

interface ImageDrop {
  readonly at: Point;
  readonly file: File;
  readonly ghost: Box | null;
  readonly spot: Point | null;
  readonly url: string;
}

interface ImageDropStart {
  readonly at: Point | null;
  readonly camera: ImageDropCamera | null;
  readonly file: File;
  readonly frames: readonly CanvasFrame[];
}

const IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_SIZE = { height: 900, width: 1440 };

const PROMPT_WIDTH = 320;

const PROMPT_HEIGHT = 96;

const EDGE = 16;

const isDropImage = (type: string): boolean => IMAGE_TYPES.has(type);

const toEntryFile = (entry: DataTransferItem | File): File | null => {
  if (entry instanceof File) {
    return entry;
  }

  return entry.getAsFile();
};

const toImageFile = (
  list: DataTransferItemList | FileList | null
): File | null => {
  if (list === null) {
    return null;
  }

  for (const entry of list) {
    const file = toEntryFile(entry);

    if (file !== null && isDropImage(file.type)) {
      return file;
    }
  }

  return null;
};

const hasDropImage = (transfer: DataTransfer | null): boolean => {
  if (transfer === null) {
    return false;
  }

  for (const item of transfer.items) {
    if (item.kind === "file" && isDropImage(item.type)) {
      return true;
    }
  }

  return false;
};

const toShown = (frames: readonly CanvasFrame[]): CanvasFrame[] =>
  frames.filter((frame) => frame.hidden !== true);

const toCenterDistance = (frame: CanvasFrame, point: Point): number =>
  Math.hypot(
    frame.x + frame.width / 2 - point.x,
    frame.y + frame.height / 2 - point.y
  );

const isBetterFrame = (
  frame: CanvasFrame,
  best: CanvasFrame,
  point: Point | null
): boolean => {
  if (point === null) {
    return frame.x + frame.width > best.x + best.width;
  }

  return toCenterDistance(frame, point) < toCenterDistance(best, point);
};

const toNearestFrame = (
  frames: readonly CanvasFrame[],
  point: Point | null
): CanvasFrame | null => {
  let best: CanvasFrame | null = null;

  for (const frame of toShown(frames)) {
    if (best === null || isBetterFrame(frame, best, point)) {
      best = frame;
    }
  }

  return best;
};

const toPasteSpot = (frames: readonly CanvasFrame[]): Point => {
  const shown = toShown(frames);

  if (shown.length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: Math.max(...shown.map((frame) => frame.x + frame.width)) + CANVAS_GAP,
    y: Math.min(...shown.map((frame) => frame.y)),
  };
};

const toScale = (camera: ImageDropCamera): number =>
  camera.box.width / Math.max(1, camera.frame.width);

const toCanvasPoint = (camera: ImageDropCamera, at: Point): Point => {
  const scale = toScale(camera);

  return {
    x: Math.round(camera.frame.x + (at.x - camera.box.x) / scale),
    y: Math.round(camera.frame.y + (at.y - camera.box.y) / scale),
  };
};

const toScreenBox = (camera: ImageDropCamera, box: Box): Box => {
  const scale = toScale(camera);

  return {
    height: box.height * scale,
    width: box.width * scale,
    x: camera.box.x + (box.x - camera.frame.x) * scale,
    y: camera.box.y + (box.y - camera.frame.y) * scale,
  };
};

const toClampedPoint = (point: Point): Point => {
  const right = globalThis.innerWidth - PROMPT_WIDTH - EDGE;
  const bottom = globalThis.innerHeight - PROMPT_HEIGHT - EDGE;

  return {
    x: Math.max(EDGE, Math.min(right, point.x)),
    y: Math.max(EDGE, Math.min(bottom, point.y)),
  };
};

const toSpot = (start: ImageDropStart): Point | null => {
  if (start.camera === null) {
    return null;
  }

  if (start.at === null) {
    return toPasteSpot(start.frames);
  }

  return toCanvasPoint(start.camera, start.at);
};

const toGhost = (start: ImageDropStart, spot: Point | null): Box | null => {
  if (start.camera === null || spot === null) {
    return null;
  }

  const size = toNearestFrame(start.frames, spot) ?? DEFAULT_SIZE;

  return toScreenBox(start.camera, {
    height: size.height,
    width: size.width,
    x: spot.x,
    y: spot.y,
  });
};

const toCenter = (): Point => ({
  x: globalThis.innerWidth / 2 - PROMPT_WIDTH / 2,
  y: globalThis.innerHeight / 2,
});

const toBesideGhost = (ghost: Box): Point => {
  const right = ghost.x + ghost.width + EDGE;

  if (right + PROMPT_WIDTH <= globalThis.innerWidth - EDGE) {
    return { x: right, y: ghost.y };
  }

  return { x: ghost.x - PROMPT_WIDTH - EDGE, y: ghost.y };
};

const toPromptPoint = (start: ImageDropStart, ghost: Box | null): Point => {
  if (ghost !== null) {
    return toClampedPoint(toBesideGhost(ghost));
  }

  if (start.at !== null) {
    return toClampedPoint(start.at);
  }

  return toClampedPoint(toCenter());
};

const toSentSpot = (
  start: ImageDropStart,
  spot: Point | null
): Point | null => {
  if (start.at === null) {
    return null;
  }

  return spot;
};

const toImageDrop = (start: ImageDropStart, pictureUrl: string): ImageDrop => {
  const spot = toSpot(start);
  const ghostBox = toGhost(start, spot);

  return {
    at: toPromptPoint(start, ghostBox),
    file: start.file,
    ghost: ghostBox,
    spot: toSentSpot(start, spot),
    url: pictureUrl,
  };
};

export { hasDropImage, toImageDrop, toImageFile };

export type { ImageDrop, ImageDropCamera, ImageDropStart };
