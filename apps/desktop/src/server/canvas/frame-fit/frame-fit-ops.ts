import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { getWritableContext } from "../frame-ops.js";
import type { FrameTarget } from "../frame-ops.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { findFrame } from "../tools.js";
import type { CanvasToolContext } from "../tools.js";
import { toFrameFit } from "./frame-fit-measure.js";

interface FrameFitQuery extends FrameTarget {
  readonly frames: readonly string[];
}

interface FittedFrame {
  readonly id: string;
  readonly label: string | null;
  readonly newHeight: number;
  readonly oldHeight: number;
  readonly warning: string | null;
}

interface FramesFitted {
  readonly frames: readonly FittedFrame[];
  readonly note: string;
  readonly warnings: readonly string[];
}

const FIT_NOTE =
  "The frame widths stay. Undo restores the old heights in one step.";

const toCanvasFile = async (
  context: CanvasToolContext
): Promise<CanvasFile> => {
  const snapshot = await context.canvas.read(context.project);

  if (snapshot.canvas === null) {
    throw new BadRequestError("The canvas has no frames to fit.");
  }

  return snapshot.canvas;
};

const toPickedFrames = (
  file: CanvasFile,
  refs: readonly string[]
): CanvasFileFrame[] => {
  const picked = new Map<string, CanvasFileFrame>();

  for (const ref of refs) {
    const frame = findFrame(file.frames, ref);

    if (!frame) {
      throw new NotFoundError(
        `No frame ${ref}. Call canvas_list for the ids and labels.`
      );
    }

    picked.set(frame.id, frame);
  }

  return [...picked.values()];
};

const toFittedFrame = async (
  runtime: LinkRuntime,
  context: CanvasToolContext,
  frame: CanvasFileFrame
): Promise<FittedFrame> => {
  const direction =
    context.project.directions.find((item) => item.id === frame.directionId) ??
    context.direction;

  const fit = await toFrameFit(runtime, {
    direction,
    frame,
    project: context.project,
  });

  return {
    id: frame.id,
    label: frame.label ?? null,
    newHeight: fit.height,
    oldHeight: frame.height,
    warning: fit.warning,
  };
};

const toFittedFrames = (
  runtime: LinkRuntime,
  context: CanvasToolContext,
  frames: readonly CanvasFileFrame[]
): Promise<FittedFrame[]> =>
  Promise.all(frames.map((frame) => toFittedFrame(runtime, context, frame)));

const toResizedFile = (
  file: CanvasFile,
  fitted: readonly FittedFrame[]
): CanvasFile | null => {
  const byId = new Map(fitted.map((item) => [item.id, item.newHeight]));
  const isChanged = fitted.some((item) => item.newHeight !== item.oldHeight);

  if (!isChanged) {
    return null;
  }

  const frames = file.frames.map((frame) => {
    const height = byId.get(frame.id) ?? null;

    if (height === null) {
      return frame;
    }

    return { ...frame, height };
  });

  return { ...file, frames };
};

const toWarnings = (fitted: readonly FittedFrame[]): string[] =>
  fitted.flatMap((item) => {
    if (item.warning === null) {
      return [];
    }

    return [`${item.label ?? item.id}: ${item.warning}`];
  });

const setCanvasFrameHeights = async (
  runtime: LinkRuntime,
  query: FrameFitQuery
): Promise<FramesFitted> => {
  const context = await getWritableContext(runtime, query);
  const picked = toPickedFrames(await toCanvasFile(context), query.frames);
  const fitted = await toFittedFrames(runtime, context, picked);

  await context.canvas.update(
    context.project,
    (file) => toResizedFile(file, fitted),
    { source: "agent" }
  );

  return { frames: fitted, note: FIT_NOTE, warnings: toWarnings(fitted) };
};

export { setCanvasFrameHeights };

export type { FittedFrame, FrameFitQuery, FramesFitted };
