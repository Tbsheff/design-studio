import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type { SourceLoc, StackingInfo, StackingSetResult } from "./deps.js";
import { StackingError } from "./errors.js";
import { inspectStacking } from "./get.js";
import { toStackingInput } from "./input.js";
import type { StackingFieldsInput } from "./input.js";
import { applyStacking, toStackingResult } from "./set.js";
import type { StackingSetRequest } from "./set.js";
import { toStackingFailure } from "./stacking-failure.js";

interface GetStackingCommand extends DirectionIds {
  readonly breakpoint: string;
  readonly source: SourceLoc;
}

interface StackingLayerCommand {
  readonly fields: StackingFieldsInput;
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface SetStackingCommand extends DirectionIds, StackingLayerCommand {
  readonly others: readonly StackingLayerCommand[];
}

type StackingChange = StackingSetResult;

const NO_CHANGE =
  "Pass at least one of position, top, right, bottom, left, overflow, overflowX, overflowY or zIndex.";

const runStackingGet = (
  command: GetStackingCommand
): Effect.Effect<StackingInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      inspectStacking(
        { direction, project, workTree: direction.workTree },
        { breakpoint: command.breakpoint, source: command.source }
      ),
    toStackingFailure
  );

const toOtherRequest = (
  layer: StackingLayerCommand,
  breakpoint: string
): StackingSetRequest | null => {
  const input = toStackingInput({ ...layer.fields, breakpoint });

  if (input === null) {
    return null;
  }

  return {
    input,
    target: { selector: layer.selector, source: layer.source, tag: layer.tag },
  };
};

const toOtherRequests = (
  others: readonly StackingLayerCommand[],
  breakpoint: string
): StackingSetRequest[] =>
  others.flatMap((layer) => {
    const request = toOtherRequest(layer, breakpoint);

    if (request === null) {
      return [];
    }

    return [request];
  });

const runStackingSet = (
  command: SetStackingCommand
): Effect.Effect<StackingChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<StackingChange> => {
      const input = toStackingInput(command.fields);

      if (input === null) {
        throw new StackingError(NO_CHANGE);
      }

      const { plan, version } = await applyStacking(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          input,
          target: {
            selector: command.selector,
            source: command.source,
            tag: command.tag,
          },
        },
        toOtherRequests(command.others, input.breakpoint)
      );

      return toStackingResult(plan, version);
    },
    toStackingFailure
  );

export { runStackingGet, runStackingSet };

export type {
  GetStackingCommand,
  SetStackingCommand,
  StackingChange,
  StackingLayerCommand,
};
