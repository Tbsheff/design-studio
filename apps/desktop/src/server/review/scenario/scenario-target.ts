import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import { findFrame } from "../../canvas/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { withPagePath } from "../../project-source/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";

type ScenarioRuntime = ViewportRuntime;

interface TargetCommand {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

type FrameInfo = Pick<
  CanvasFileFrame,
  "directionId" | "height" | "id" | "label" | "path" | "width"
>;

interface ScenarioTarget {
  readonly direction: Direction;
  readonly frame: FrameInfo;
  readonly project: Project;
  readonly projectDir: string;
  readonly url: string;
}

const DEFAULT_FRAME = { height: 900, width: 1440 } as const;

const IMPLICIT_FRAME_ID = "f1";

const toFrame = (
  frames: readonly CanvasFileFrame[],
  frameId: string
): FrameInfo | null => {
  const found = findFrame(frames, frameId);

  if (found !== null) {
    return found;
  }

  if (frames.length === 0 && frameId === IMPLICIT_FRAME_ID) {
    return { ...DEFAULT_FRAME, id: IMPLICIT_FRAME_ID };
  }

  return null;
};

const loadScenarioTarget = Effect.fn("loadScenarioTarget")(function* run(
  runtime: ViewportRuntime,
  command: TargetCommand
) {
  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, command.directionId)
  );

  if (!project.app) {
    return yield* new BadRequest({
      message:
        "Scenarios work only for attached app projects. This project is not an app.",
    });
  }

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
      message: `Frame ${frame.id} shows direction ${owner}. Pass that directionId.`,
    });
  }

  const base = yield* attemptKnown(() =>
    runtime.preview.directionUrl(project, direction)
  );

  const target: ScenarioTarget = {
    direction,
    frame,
    project,
    projectDir: runtime.projectDir(project.id),
    url: withPagePath(base, frame.path),
  };

  return target;
});

export { loadScenarioTarget };

export type { FrameInfo, ScenarioRuntime, ScenarioTarget, TargetCommand };
