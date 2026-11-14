import type {
  ForcedStateChange,
  StateListResult,
  StateStyleResult,
  StyleState,
} from "@design-studio/contracts/state-styles";
import type { Effect } from "effect";

import { runDirectionRead, runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import type { SourceLoc } from "./deps.js";
import { setForcedState } from "./forced.js";
import { toStateInput } from "./input.js";
import { getStateStyleInfo } from "./list.js";
import { applyStateStyle, toStateResult } from "./set.js";
import { toStateStyleFailure } from "./state-style-failure.js";

interface InspectStateStyleCommand extends DirectionIds {
  readonly source: SourceLoc;
}

interface SetStateStyleCommand extends DirectionIds {
  readonly fields: {
    readonly breakpoint?: string | undefined;
    readonly property: string;
    readonly reset?: boolean | undefined;
    readonly state: StyleState;
    readonly value?: string | undefined;
  };
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface SetForcedStateStyleCommand extends DirectionIds {
  readonly frameId: string | null;
  readonly layer: string | null;
  readonly state: StyleState | null;
}

const DEFAULT_FRAME = "f1";

const runStateStyleInspect = (
  command: InspectStateStyleCommand
): Effect.Effect<StateListResult, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      getStateStyleInfo(
        { direction, project, workTree: direction.workTree },
        command.source
      ),
    toStateStyleFailure
  );

const runStateStyleSet = (
  command: SetStateStyleCommand
): Effect.Effect<StateStyleResult, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<StateStyleResult> => {
      const { plan, version } = await applyStateStyle(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          input: toStateInput(command.fields),
          target: {
            selector: command.selector,
            source: command.source,
            tag: command.tag,
          },
        }
      );

      return toStateResult(plan, version);
    },
    toStateStyleFailure
  );

const runStateStyleForced = (
  command: SetForcedStateStyleCommand
): Effect.Effect<ForcedStateChange, KnownFailure> =>
  runDirectionRead(
    command,
    async ({ project, runtime }): Promise<ForcedStateChange> => {
      const snapshot = await runtime.canvas.read(project);
      const canvasFrames = snapshot.canvas?.frames ?? [];

      const bound = canvasFrames.find(
        (frame) => frame.directionId === command.directionId
      );

      const fallback = bound?.id ?? canvasFrames[0]?.id ?? DEFAULT_FRAME;

      return setForcedState({
        frameId: command.frameId ?? fallback,
        frames: canvasFrames,
        layer: command.layer,
        projectId: project.id,
        state: command.state,
      });
    },
    toStateStyleFailure
  );

export { runStateStyleForced, runStateStyleInspect, runStateStyleSet };

export type {
  InspectStateStyleCommand,
  SetForcedStateStyleCommand,
  SetStateStyleCommand,
};
