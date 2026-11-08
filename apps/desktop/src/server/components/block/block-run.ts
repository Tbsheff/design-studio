import type { Effect } from "effect";

import { toBlockFailure } from "./block-failure.js";
import { runBlockInsertTask } from "./block-insert.js";
import type { BlockInserted, InsertBlockCommand } from "./block-insert.js";
import { runBlockList } from "./block-list.js";
import type { BlockPage, ListBlockCommand } from "./block-list.js";
import { runDirectionRead, runDirectionWrite } from "./deps.js";
import type { DirectionIds, KnownFailure } from "./deps.js";

const MAIN_DIRECTION = "main";

const toIds = (
  projectId: string,
  directionId: string | null
): DirectionIds => ({
  directionId: directionId ?? MAIN_DIRECTION,
  projectId,
});

const runBlockListEffect = (
  command: ListBlockCommand
): Effect.Effect<BlockPage, KnownFailure> =>
  runDirectionRead(
    toIds(command.projectId, null),
    (run) => runBlockList(run.project, run.direction.workTree, command),
    toBlockFailure
  );

const runBlockInsertEffect = (
  command: InsertBlockCommand
): Effect.Effect<BlockInserted, KnownFailure> =>
  runDirectionWrite(
    toIds(command.projectId, command.directionId),
    (run) => runBlockInsertTask(run, command),
    toBlockFailure
  );

export { runBlockInsertEffect, runBlockListEffect };
