import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { getCanvasContext, getWritableContext } from "../frame-ops.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { findFrame } from "../tools.js";

interface FramesDeleteQuery {
  readonly frames: readonly string[];
  readonly projectId: string;
}

interface RemovedFrame {
  readonly id: string;
  readonly label: string | null;
}

interface FramesRemoved {
  readonly note: string;
  readonly removedFrames: readonly RemovedFrame[];
}

const toPickedFrames = (
  frames: readonly CanvasFileFrame[],
  refs: readonly string[]
): CanvasFileFrame[] => {
  const picked = new Map<string, CanvasFileFrame>();

  for (const ref of refs) {
    const frame = findFrame([...frames], ref);

    if (!frame) {
      throw new NotFoundError(
        `No frame ${ref}. Call canvas_list for the ids and labels.`
      );
    }

    picked.set(frame.id, frame);
  }

  if (picked.size >= frames.length) {
    throw new BadRequestError(
      "The canvas needs at least one frame. Leave one frame out."
    );
  }

  return [...picked.values()];
};

const toRemovedFrame = (frame: CanvasFileFrame): RemovedFrame => ({
  id: frame.id,
  label: frame.label ?? null,
});

const toFrameName = (frame: CanvasFileFrame): string => {
  if (frame.label) {
    return `${frame.id} (${frame.label})`;
  }

  return frame.id;
};

const toKeptFile = (
  file: CanvasFile,
  picked: readonly CanvasFileFrame[]
): CanvasFile => {
  const ids = new Set(picked.map((frame) => frame.id));

  return { ...file, frames: file.frames.filter((frame) => !ids.has(frame.id)) };
};

const deleteCanvasFrames = async (
  runtime: LinkRuntime,
  query: FramesDeleteQuery
): Promise<FramesRemoved> => {
  const context = await getWritableContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const removal = { frames: [] as CanvasFileFrame[] };

  await context.canvas.update(
    context.project,
    (file) => {
      removal.frames = toPickedFrames(file.frames, query.frames);

      return toKeptFile(file, removal.frames);
    },
    { source: "agent" }
  );

  if (removal.frames.length === 0) {
    throw new BadRequestError("The canvas has no frames to remove.");
  }

  return {
    note: "The page files stay in the project. One undo brings all the frames back.",
    removedFrames: removal.frames.map((frame) => toRemovedFrame(frame)),
  };
};

const getCanvasFramesDeleteCard = async (
  runtime: LinkRuntime,
  query: FramesDeleteQuery
): Promise<ApprovalCard> => {
  const context = await getCanvasContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const { canvas } = await context.canvas.read(context.project);
  const picked = toPickedFrames(canvas?.frames ?? [], query.frames);
  const names = picked.map((frame) => toFrameName(frame)).join(", ");

  return {
    action: "Remove canvas frames",
    detail:
      "The page files stay in the project. One undo brings all the frames back.",
    title: `Remove ${picked.length} frames: ${names}`,
  };
};

export { deleteCanvasFrames, getCanvasFramesDeleteCard };

export type { FramesDeleteQuery, FramesRemoved, RemovedFrame };
