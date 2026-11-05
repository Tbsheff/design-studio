import type { Effect } from "effect";

import { runDirectionRead, runDirectionWrite } from "../direct-edit/index.js";
import type { DirectionIds } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import type { SpacingInput, SpacingSetResult, SourceLoc } from "./deps.js";
import { applySpacing, toSpacingResult } from "./set.js";
import { toSpacingFailure } from "./spacing-failure.js";
import { getSpacingBox } from "./spacing-scale.js";
import type { SpacingBox, SpacingComputed } from "./spacing-scale.js";

interface GetSpacingCommand extends DirectionIds {
  readonly computed: SpacingComputed;
  readonly source: SourceLoc;
}

interface SetSpacingCommand extends DirectionIds {
  readonly input: SpacingInput;
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

type SpacingChange = SpacingSetResult;

const runSpacingGet = (
  command: GetSpacingCommand
): Effect.Effect<SpacingBox, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      getSpacingBox(
        { direction, project, workTree: direction.workTree },
        command.source,
        command.computed
      ),
    toSpacingFailure
  );

const runSpacingSet = (
  command: SetSpacingCommand
): Effect.Effect<SpacingChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<SpacingChange> => {
      const { plan, version } = await applySpacing(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          input: command.input,
          target: {
            selector: command.selector,
            source: command.source,
            tag: command.tag,
          },
        }
      );

      return toSpacingResult(plan, version);
    },
    toSpacingFailure
  );

export { runSpacingGet, runSpacingSet };

export type { GetSpacingCommand, SetSpacingCommand, SpacingChange };
