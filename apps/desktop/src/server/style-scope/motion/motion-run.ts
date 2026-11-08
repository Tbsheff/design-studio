import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import type { ClassChanges } from "./classes.js";
import type { MotionInfo, MotionKind, MotionMode, SourceLoc } from "./deps.js";
import { getMotionInfo } from "./list.js";
import { toMotionFailure } from "./motion-failure.js";
import { applyMotion } from "./set.js";
import type { MotionTarget } from "./set.js";
import { specOf } from "./spec.js";
import type { MotionInput } from "./spec.js";

interface GetMotionCommand extends DirectionIds {
  readonly source: SourceLoc;
}

interface SetMotionCommand extends DirectionIds {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly spec: MotionInput;
  readonly tag: string | null;
}

interface MotionChange {
  readonly classes: ClassChanges | null;
  readonly files: readonly string[];
  readonly kind: MotionKind;
  readonly mode: MotionMode;
  readonly title: string;
  readonly versionId: string;
}

const toTarget = (command: SetMotionCommand): MotionTarget => {
  const target: MotionTarget = { source: command.source };

  if (command.selector !== null) {
    target.selector = command.selector;
  }

  if (command.tag !== null) {
    target.tag = command.tag;
  }

  return target;
};

const runMotionGet = (
  command: GetMotionCommand
): Effect.Effect<MotionInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      getMotionInfo({ project, workTree: direction.workTree }, command.source),
    toMotionFailure
  );

const runMotionSet = (
  command: SetMotionCommand
): Effect.Effect<MotionChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<MotionChange> => {
      const { plan, version } = await applyMotion(
        runtime.editDeps,
        { direction, project, workTree: direction.workTree },
        { spec: specOf(command.spec), target: toTarget(command) }
      );

      return {
        classes: plan.classes,
        files: plan.written.map((entry) => entry.target.relative),
        kind: plan.kind,
        mode: plan.mode,
        title: plan.title,
        versionId: version.id,
      };
    },
    toMotionFailure
  );

export { runMotionGet, runMotionSet };

export type { GetMotionCommand, MotionChange, SetMotionCommand };
