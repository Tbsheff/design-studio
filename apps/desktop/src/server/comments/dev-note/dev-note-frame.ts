import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import { canvasOwner, findFrame } from "../../canvas/index.js";

const IMPLICIT_FRAME_ID = "f1";

const DEFAULT_SIZE = { height: 900, width: 1440 } as const;

interface DevNoteFrame {
  readonly directionId: string;
  readonly path: string | null;
  readonly size: { readonly height: number; readonly width: number };
}

const toFrameSize = (frame: CanvasFileFrame | null): DevNoteFrame["size"] => {
  if (frame === null) {
    return DEFAULT_SIZE;
  }

  return { height: frame.height, width: frame.width };
};

const getDevNoteFrame = Effect.fn("DevNoteFrame.get")(function* run(
  project: Project,
  frames: readonly CanvasFileFrame[],
  frameId: string
) {
  const frame = findFrame(frames, frameId);

  if (
    frame === null &&
    !(frames.length === 0 && frameId === IMPLICIT_FRAME_ID)
  ) {
    return yield* new NotFound({
      message: `No frame ${frameId} on the canvas. Use canvas_list for the frame ids.`,
    });
  }

  const owner = frame?.directionId ?? canvasOwner(project).id;

  const target: DevNoteFrame = {
    directionId: owner,
    path: frame?.path ?? null,
    size: toFrameSize(frame),
  };

  return target;
});

export { getDevNoteFrame };

export type { DevNoteFrame };
