import type { Effect } from "effect";

import type { KnownFailure } from "./deps.js";
import { applyWork } from "./prop-commit.js";
import { toChangeResult } from "./prop-model.js";
import type { PropChange } from "./prop-model.js";
import {
  listWork,
  getCreateWork,
  getDeleteWork,
  getRenameWork,
} from "./prop-plan.js";
import type {
  CreateCommand,
  DeleteCommand,
  ListedProp,
  PropWork,
  RenameCommand,
} from "./prop-plan.js";
import { runPropTask } from "./prop-runtime.js";
import type { PropRun } from "./prop-runtime.js";
import type { TargetCommand } from "./prop-target.js";

type Failing<Value> = Effect.Effect<Value, KnownFailure>;

const runFinish = async (run: PropRun, work: PropWork): Promise<PropChange> => {
  const versionId = await applyWork(run, work);

  return toChangeResult(work, versionId);
};

const runCreate = (command: CreateCommand): Failing<PropChange> =>
  runPropTask(command, async (run) =>
    runFinish(run, await getCreateWork(run.scope, command))
  );

const runRename = (command: RenameCommand): Failing<PropChange> =>
  runPropTask(command, async (run) =>
    runFinish(run, await getRenameWork(run.scope, command))
  );

const runDelete = (command: DeleteCommand): Failing<PropChange> =>
  runPropTask(command, async (run) =>
    runFinish(run, await getDeleteWork(run.scope, command))
  );

const inspectDeletePreview = (command: DeleteCommand): Failing<PropChange> =>
  runPropTask(command, async (run) =>
    toChangeResult(await getDeleteWork(run.scope, command), null)
  );

const listPropRows = (command: TargetCommand): Failing<ListedProp[]> =>
  runPropTask(command, (run) => listWork(run.scope, command));

export { inspectDeletePreview, listPropRows, runCreate, runDelete, runRename };
