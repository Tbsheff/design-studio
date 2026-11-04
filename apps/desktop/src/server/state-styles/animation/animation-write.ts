import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import type { Effect } from "effect";

import { applyWork } from "./animation-commit.js";
import { toAnimationExport } from "./animation-export.js";
import type {
  AnimationExport,
  AnimationExportFormat,
} from "./animation-export.js";
import { listModels } from "./animation-files.js";
import {
  getCreateWork,
  getDeleteWork,
  getExisting,
  getUpdateWork,
} from "./animation-plan.js";
import type {
  CreateCommand,
  PlannedWork,
  UpdateCommand,
} from "./animation-plan.js";
import { runAnimationTask } from "./animation-runtime.js";
import type { AnimationRun } from "./animation-runtime.js";
import type { RefCommand, TargetCommand } from "./animation-scope.js";
import { toUnavailable } from "./animation-unavailable.js";
import type { KnownFailure } from "./deps.js";
import type { AnimationModel } from "./engine/index.js";

interface AnimationChange {
  readonly animation: AnimationModel;
  readonly files: readonly string[];
  readonly title: string;
  readonly versionId: string | null;
}

interface AnimationRemoved {
  readonly files: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly versionId: string | null;
}

interface ExportCommand extends RefCommand {
  readonly format: AnimationExportFormat;
}

type Failing<Value> = Effect.Effect<Value, KnownFailure>;

const runFinish = async (
  run: AnimationRun,
  work: PlannedWork
): Promise<AnimationChange> => {
  const versionId = await applyWork(run, work);

  return {
    animation: work.model,
    files: work.changes.map((change) => change.relative),
    title: work.title,
    versionId,
  };
};

const runCreate = (command: CreateCommand): Failing<AnimationChange> =>
  runAnimationTask(
    command,
    async (run) => runFinish(run, await getCreateWork(run.scope, command)),
    null
  );

const runUpdate = (command: UpdateCommand): Failing<AnimationChange> =>
  runAnimationTask(
    command,
    async (run) => runFinish(run, await getUpdateWork(run.scope, command)),
    null
  );

const runDelete = (command: RefCommand): Failing<AnimationRemoved> =>
  runAnimationTask(
    command,
    async (run) => {
      const work = await getDeleteWork(run.scope, command);
      const versionId = await applyWork(run, work);

      return {
        files: work.changes.map((change) => change.relative),
        id: work.model.id,
        name: work.model.name,
        title: work.title,
        versionId,
      };
    },
    null
  );

const runExport = (
  command: ExportCommand
): Effect.Effect<AnimationExport, KnownFailure | Unavailable> =>
  runAnimationTask(
    command,
    async (run) => {
      const model = await getExisting(run.scope, command.animationId);

      return await toAnimationExport(run.scope, model, command.format);
    },
    toUnavailable
  );

const runList = (command: TargetCommand): Failing<AnimationModel[]> =>
  runAnimationTask(command, (run) => listModels(run.scope.workTree), null);

const runGet = (command: RefCommand): Failing<AnimationModel> =>
  runAnimationTask(
    command,
    (run) => getExisting(run.scope, command.animationId),
    null
  );

const runPreviewDelete = (command: RefCommand): Failing<AnimationRemoved> =>
  runAnimationTask(
    command,
    async (run) => {
      const work = await getDeleteWork(run.scope, command);

      return {
        files: work.changes.map((change) => change.relative),
        id: work.model.id,
        name: work.model.name,
        title: work.title,
        versionId: null,
      };
    },
    null
  );

export {
  runCreate,
  runDelete,
  runExport,
  runGet,
  runList,
  runPreviewDelete,
  runUpdate,
};

export type { AnimationChange, AnimationRemoved, ExportCommand };
