import path from "node:path";

import {
  assertCanEdit,
  publishVersion,
  savesSettled,
  writeAndCommitAll,
} from "./deps.js";
import type { DirectionRun } from "./deps.js";
import type { FileChange } from "./kit-drift-apply.js";

const TITLE = "Swap kit components";

const applyKitDriftCommit = async (
  run: DirectionRun,
  changes: readonly FileChange[]
): Promise<string> => {
  const { direction, project, runtime } = run;
  const { editDeps } = runtime;
  const count = changes.reduce((total, change) => total + change.ids.length, 0);

  const files = changes.map((change) => ({
    code: change.after,
    original: change.before,
    target: {
      file: path.join(direction.workTree, change.relative),
      relative: change.relative,
    },
  }));

  const version = await writeAndCommitAll(
    editDeps,
    project,
    direction,
    files,
    TITLE,
    {
      kind: "manual",
      prompt: `${TITLE}: ${count} elements in ${changes.length} files`,
    }
  );

  editDeps.history?.record({
    directionId: direction.id,
    files: changes.map((change) => ({
      after: change.after,
      before: change.before,
      file: path.join(direction.workTree, change.relative),
      relative: change.relative,
    })),
    label: TITLE,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(editDeps, project, direction, version);

  return version.id;
};

const startKitDriftWrite = async (run: DirectionRun): Promise<void> => {
  assertCanEdit(run.runtime.editDeps, run.project, run.direction);
  await savesSettled(run.project.id);
};

export { startKitDriftWrite, applyKitDriftCommit };
