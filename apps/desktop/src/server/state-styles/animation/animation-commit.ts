import { rm } from "node:fs/promises";
import path from "node:path";

import type { AnimationRun } from "./animation-runtime.js";
import type { FileChange } from "./animation-scope.js";
import {
  assertCanEdit,
  publishVersion,
  saveDeferred,
  savesSettled,
  writeAtomic,
  writeNewFile,
} from "./deps.js";
import type { VersionMeta } from "./deps.js";

interface AnimationWork {
  readonly changes: readonly FileChange[];
  readonly title: string;
}

const applyChange = async (file: string, change: FileChange): Promise<void> => {
  if (change.after === null) {
    await rm(file, { force: true });

    return;
  }

  if (change.before === null) {
    await writeNewFile(file, change.after);

    return;
  }

  await writeAtomic(file, change.after);
};

const restoreChange = async (
  file: string,
  change: FileChange
): Promise<void> => {
  if (change.before === null) {
    await rm(file, { force: true });

    return;
  }

  await writeAtomic(file, change.before);
};

const applyFrom = async (
  workTree: string,
  changes: readonly FileChange[],
  index: number
): Promise<void> => {
  const change = changes[index];

  if (!change) {
    return;
  }

  await applyChange(path.join(workTree, change.relative), change);
  await applyFrom(workTree, changes, index + 1);
};

const applyChanges = async (
  workTree: string,
  changes: readonly FileChange[]
): Promise<void> => {
  try {
    await applyFrom(workTree, changes, 0);
  } catch (error) {
    await Promise.allSettled(
      changes.map((change) =>
        restoreChange(path.join(workTree, change.relative), change)
      )
    );

    throw error;
  }
};

const applyWork = async (
  run: AnimationRun,
  work: AnimationWork
): Promise<string> => {
  const { direction, project, workTree } = run.scope;
  const { editDeps } = run.runtime;

  assertCanEdit(editDeps, project, direction);
  await savesSettled(project.id);
  await applyChanges(workTree, work.changes);

  const relatives = work.changes.map((change) => change.relative);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${work.title}: ${relatives.join(", ")}`,
  };

  const version = saveDeferred(
    editDeps,
    project,
    direction,
    relatives,
    work.title,
    meta
  );

  editDeps.history?.record({
    directionId: direction.id,
    files: work.changes.map((change) => ({
      after: change.after ?? "",
      before: change.before ?? "",
      created: change.before === null,
      file: path.join(workTree, change.relative),
      relative: change.relative,
    })),
    label: work.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(editDeps, project, direction, version);

  return version.id;
};

export { applyWork };

export type { AnimationWork };
