import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import { isPersonRequest } from "../call-origin/index.js";
import { loadConfig } from "../config/index.js";
import { ForbiddenError, assertSafeId } from "../errors/index.js";
import { isPathLocked } from "./engine/is-path-locked.js";
import { getFileLocks } from "./lock-file.js";

interface WriteTarget {
  readonly directionId: string;
  readonly projectId: string;
  readonly workTree: string;
}

const FILE_LOCKED_MESSAGE =
  "This file is locked. Unlock it in Code to let Claude change it.";

const targets = new AsyncLocalStorage<WriteTarget>();

const toLockProjectDir = (projectId: string): string =>
  path.join(
    loadConfig().dataDir,
    "projects",
    assertSafeId(projectId, "projectId")
  );

const runFileLockGuard = async (
  projectId: string,
  directionId: string,
  relatives: readonly string[]
): Promise<void> => {
  if (isPersonRequest() || relatives.length === 0) {
    return;
  }

  const globs = await getFileLocks(toLockProjectDir(projectId), directionId);

  if (relatives.some((relative) => isPathLocked(globs, relative))) {
    throw new ForbiddenError(FILE_LOCKED_MESSAGE);
  }
};

const runWithWriteTarget = <Value>(
  target: WriteTarget,
  task: () => Promise<Value>
): Promise<Value> => targets.run(target, task);

type WithDirection = <Value>(
  projectId: string,
  directionId: string,
  task: (project: Project, direction: Direction) => Promise<Value>
) => Promise<Value>;

const toGuardedDirection =
  (withDirection: WithDirection): WithDirection =>
  (projectId, directionId, task) =>
    withDirection(projectId, directionId, (project, direction) =>
      runWithWriteTarget(
        {
          directionId: direction.id,
          projectId: project.id,
          workTree: direction.workTree,
        },
        () => task(project, direction)
      )
    );

const toTargetRelative = (target: WriteTarget, file: string): string | null => {
  const relative = path.relative(path.resolve(target.workTree), file);

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return relative.split(path.sep).join("/");
};

const runWriteTargetGuard = async (file: string): Promise<void> => {
  const target = targets.getStore() ?? null;

  if (target === null || isPersonRequest()) {
    return;
  }

  const relative = toTargetRelative(target, path.resolve(file));

  if (relative === null) {
    return;
  }

  await runFileLockGuard(target.projectId, target.directionId, [relative]);
};

export {
  FILE_LOCKED_MESSAGE,
  runFileLockGuard,
  runWithWriteTarget,
  runWriteTargetGuard,
  toGuardedDirection,
};

export type { WithDirection, WriteTarget };
