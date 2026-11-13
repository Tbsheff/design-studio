import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

const DEFAULT_NAME = "Imported screen";

const NAME_MAX = 80;

const toCenterDistance = (
  frame: CanvasFileFrame,
  x: number,
  y: number
): number =>
  Math.hypot(frame.x + frame.width / 2 - x, frame.y + frame.height / 2 - y);

const toLastFrame = (
  frames: readonly CanvasFileFrame[]
): CanvasFileFrame | null => {
  let last: CanvasFileFrame | null = null;

  for (const frame of frames) {
    if (last === null || frame.x + frame.width > last.x + last.width) {
      last = frame;
    }
  }

  return last;
};

const toNearestFrame = (
  frames: readonly CanvasFileFrame[],
  x: number | null,
  y: number | null
): CanvasFileFrame | null => {
  const shown = frames.filter((frame) => frame.hidden !== true);

  if (x === null || y === null) {
    return toLastFrame(shown);
  }

  let nearest: CanvasFileFrame | null = null;

  for (const frame of shown) {
    if (
      nearest === null ||
      toCenterDistance(frame, x, y) < toCenterDistance(nearest, x, y)
    ) {
      nearest = frame;
    }
  }

  return nearest;
};

const toImportName = (name: string | null): string => {
  const clean = name?.trim().slice(0, NAME_MAX) ?? "";

  if (clean === "") {
    return DEFAULT_NAME;
  }

  return clean;
};

export { toImportName, toNearestFrame };
