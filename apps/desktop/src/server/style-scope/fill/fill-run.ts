import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type { ClassChanges } from "./classes.js";
import type { FillBlend, FillInfo, FillSpec, SourceLoc } from "./deps.js";
import { toFillFailure } from "./fill-failure.js";
import { inspectFill } from "./get.js";
import { applyFill } from "./set.js";
import type { FillTarget } from "./set.js";
import type { FillInput } from "./spec.js";

interface GetFillCommand extends DirectionIds {
  readonly source: SourceLoc;
}

interface SetFillCommand extends DirectionIds {
  readonly fill: FillInput;
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
  readonly variant: string;
}

interface FillChange {
  readonly blend: FillBlend | null;
  readonly classes: ClassChanges | null;
  readonly files: readonly string[];
  readonly fill: FillSpec;
  readonly mode: "classes" | "css";
  readonly title: string;
  readonly versionId: string;
}

const toTarget = (command: SetFillCommand): FillTarget => {
  const target: FillTarget = { source: command.source };

  if (command.selector !== null) {
    target.selector = command.selector;
  }

  if (command.tag !== null) {
    target.tag = command.tag;
  }

  return target;
};

const runFillGet = (
  command: GetFillCommand
): Effect.Effect<FillInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      inspectFill(
        { direction, project, workTree: direction.workTree },
        command.source
      ),
    toFillFailure
  );

const runFillSet = (
  command: SetFillCommand
): Effect.Effect<FillChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<FillChange> => {
      const { plan, version } = await applyFill(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        {
          input: command.fill,
          target: toTarget(command),
          variant: command.variant,
        }
      );

      return {
        blend: plan.blend,
        classes: plan.classes,
        files: plan.written.map((entry) => entry.target.relative),
        fill: plan.fill,
        mode: plan.mode,
        title: plan.title,
        versionId: version.id,
      };
    },
    toFillFailure
  );

export { runFillGet, runFillSet };

export type { FillChange, GetFillCommand, SetFillCommand };
