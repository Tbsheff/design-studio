import { Effect } from "effect";

import { toCreatePlan, toDuplicatePlan } from "../../app/index.js";
import type {
  CreateScreenCommand,
  DuplicateScreenCommand,
  ScreenCreated,
  ScreenDuplicated,
  ScreenScope,
} from "../../app/index.js";
import {
  runDirectionWrite,
  toDirectEditStatusFailure,
} from "../../direct-edit/index.js";
import type { DirectionRun } from "../../direct-edit/index.js";
import { createScreenFiles } from "./screen-commit.js";

const toScope = (run: DirectionRun): ScreenScope => ({
  direction: run.direction,
  project: run.project,
  projectDir: run.runtime.projectDir(run.project.id),
});

const toCreated = async (
  run: DirectionRun,
  command: CreateScreenCommand
): Promise<ScreenCreated> => {
  const plan = await toCreatePlan(toScope(run), command);
  const done = await createScreenFiles(run, plan);
  const filePath = plan.files.at(0)?.relative ?? "";

  return {
    filePath,
    frameId: done.frameId,
    route: plan.route,
    versionId: done.versionId,
  };
};

const toDuplicated = async (
  run: DirectionRun,
  command: DuplicateScreenCommand
): Promise<ScreenDuplicated> => {
  const plan = await toDuplicatePlan(toScope(run), command);
  const done = await createScreenFiles(run, plan);

  return {
    files: plan.files.map((file) => file.relative),
    frameId: done.frameId,
    route: plan.route,
    versionId: done.versionId,
  };
};

const runScreenCreate = Effect.fn("ScreenRun.create")(function* run(
  command: CreateScreenCommand
) {
  return yield* runDirectionWrite(
    command,
    (scope) => toCreated(scope, command),
    toDirectEditStatusFailure
  );
});

const runScreenDuplicate = Effect.fn("ScreenRun.duplicate")(function* run(
  command: DuplicateScreenCommand
) {
  return yield* runDirectionWrite(
    command,
    (scope) => toDuplicated(scope, command),
    toDirectEditStatusFailure
  );
});

export { runScreenCreate, runScreenDuplicate };
