import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

import { findFrame } from "../../canvas/index.js";
import type { CanvasService } from "../../canvas/index.js";
import { BadRequestError } from "../../platform/errors/index.js";

interface SpellingFrame {
  readonly id: string;
  readonly page: string;
  readonly viewport: { readonly height: number; readonly width: number };
}

const DEFAULT_FRAME: SpellingFrame = {
  id: "f1",
  page: "",
  viewport: { height: 900, width: 1440 },
};

const toLiveFrame = (
  canvas: CanvasService,
  project: Project,
  direction: Direction,
  frames: readonly CanvasFileFrame[]
): CanvasFileFrame | null => {
  const mine = frames.filter(
    (frame) => (frame.directionId ?? direction.id) === direction.id
  );

  const presence = canvas.presence(project.id);
  const live = mine.find((frame) => frame.id === presence?.activeFrameId);

  if (presence?.directionId === direction.id && live) {
    return live;
  }

  return mine.find((frame) => !frame.hidden) ?? null;
};

const toFoundFrame = (
  frames: readonly CanvasFileFrame[],
  ref: string | null,
  live: CanvasFileFrame | null
): CanvasFileFrame | null => {
  if (ref === null) {
    return live;
  }

  return findFrame(frames, ref);
};

const toSpellingFrame = async (
  canvas: CanvasService,
  project: Project,
  direction: Direction,
  ref: string | null
): Promise<SpellingFrame> => {
  const snapshot = await canvas.read(project);
  const frames = snapshot.canvas?.frames ?? [];
  const live = toLiveFrame(canvas, project, direction, frames);
  const found = toFoundFrame(frames, ref, live);

  if (found === null && ref !== null) {
    throw new BadRequestError(
      `No frame ${ref} on the canvas. Use canvas_list for the frame ids.`
    );
  }

  if (found === null) {
    return DEFAULT_FRAME;
  }

  return {
    id: found.id,
    page: found.path || "",
    viewport: { height: found.height, width: found.width },
  };
};

export { toSpellingFrame };

export type { SpellingFrame };
