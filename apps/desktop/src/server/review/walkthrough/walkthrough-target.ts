import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import { findFrame } from "../../canvas/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { PreviewService } from "../../preview/index.js";
import { withPagePath } from "../../project-source/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";

interface TargetCommand {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface WalkTarget {
  readonly directionId: string;
  readonly height: number;
  readonly url: string;
  readonly width: number;
  readonly withPage: NonNullable<PreviewService["withPage"]>;
}

const DEFAULT_FRAME = { height: 900, width: 1440 } as const;

const IMPLICIT_FRAME_ID = "f1";

const MAIN_DIRECTION_ID = "main";

const toDirectionId = (directionId: string | null): string => {
  if (directionId === null) {
    return MAIN_DIRECTION_ID;
  }

  return directionId;
};

const toFrame = (
  frames: readonly CanvasFileFrame[],
  frameId: string
): Pick<
  CanvasFileFrame,
  "directionId" | "height" | "path" | "width"
> | null => {
  const found = findFrame(frames, frameId);

  if (found !== null) {
    return found;
  }

  if (frames.length === 0 && frameId === IMPLICIT_FRAME_ID) {
    return { ...DEFAULT_FRAME };
  }

  return null;
};

const loadWalkTarget = Effect.fn("loadWalkTarget")(function* run(
  runtime: ViewportRuntime,
  command: TargetCommand
) {
  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, toDirectionId(command.directionId))
  );

  const snapshot = yield* attemptKnown(() => runtime.canvas.read(project));
  const frame = toFrame(snapshot.canvas?.frames ?? [], command.frameId);

  if (frame === null) {
    return yield* new NotFound({
      message: `No frame ${command.frameId} on the canvas. Use canvas_list for the frame ids.`,
    });
  }

  const owner = frame.directionId ?? null;

  if (owner !== null && owner !== direction.id) {
    return yield* new BadRequest({
      message: `Frame ${command.frameId} shows direction ${owner}. Pass that directionId.`,
    });
  }

  const withPage = runtime.preview.withPage?.bind(runtime.preview) ?? null;

  if (withPage === null) {
    return yield* new Conflict({
      message: "This preview backend cannot run a walkthrough.",
    });
  }

  const base = yield* attemptKnown(() =>
    runtime.preview.directionUrl(project, direction)
  );

  const target: WalkTarget = {
    directionId: direction.id,
    height: frame.height,
    url: withPagePath(base, frame.path),
    width: frame.width,
    withPage,
  };

  return target;
});

export { loadWalkTarget };

export type { TargetCommand, WalkTarget };
