import type {
  Direction,
  Project,
  Version,
  VersionMeta,
} from "@design-studio/contracts";

import {
  announcePlanned,
  noteTreeWrite,
  withdrawPlanned,
} from "../../events/index.js";
import { isOutsideRequest } from "../../platform/call-origin/index.js";
import { DirectEditError } from "../engine/errors.js";
import type { DirectEditDeps } from "./edit-types.js";
import { isPendingVersion, saveLater } from "./save-queue.js";

export async function publishVersion(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  version: Version,
  withStatus = true
): Promise<void> {
  noteTreeWrite(
    direction.workTree,
    version.changedFiles,
    (version.changedFilesTotal ?? version.changedFiles.length) <=
      version.changedFiles.length
  );

  if (isPendingVersion(version)) {
    return;
  }

  deps.bus.emit({
    type: "version.created",
    projectId: project.id,
    directionId: direction.id,
    version,
  });

  const updated = await deps.projects.updateDirection(
    project.id,
    direction.id,
    { headVersionId: version.id }
  );

  deps.bus.emit({
    type: "direction.updated",
    projectId: project.id,
    directionId: direction.id,
    direction: updated,
  });

  if (!withStatus) {
    return;
  }

  const status = await deps.versions.status(project, direction);
  deps.bus.emit({
    type: "status.changed",
    projectId: project.id,
    directionId: direction.id,
    status,
  });
}

export function saveDeferred(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  relatives: string[],
  title: string,
  meta: VersionMeta
): Version {
  const failed = (p: Project, d: Direction, message: string) =>
    deps.bus.emit({
      type: "preview.build-error",
      projectId: p.id,
      directionId: d.id,
      message: `Version not saved: ${message}`,
    });

  return saveLater(
    {
      versions: deps.versions,
      publish: (p, d, version, withStatus, versions) =>
        publishVersion({ ...deps, versions }, p, d, version, withStatus),
      failed,
    },
    project,
    direction,
    relatives,
    title,
    meta
  );
}

export async function announceWhile<T>(
  project: Project,
  direction: Direction,
  patches: () => Parameters<typeof announcePlanned>[2],
  write: () => Promise<T>
): Promise<T> {
  const id = isOutsideRequest()
    ? announcePlanned(project.id, direction.id, patches())
    : null;

  try {
    return await write();
  } catch (error) {
    withdrawPlanned(project.id, direction.id, id);
    throw error;
  }
}

export function assertCanEdit(
  deps: Pick<DirectEditDeps, "runner">,
  project: Project,
  direction: Direction
): string {
  if (deps.runner.isRunning(project.id, direction.id)) {
    throw new DirectEditError(
      "run_in_progress",
      "The agent is editing this direction; wait for the run to finish"
    );
  }

  if (direction.headVersionId === null) {
    throw new DirectEditError(
      "no_base_version",
      "This direction has no saved version yet; keep or discard the unfinished changes first"
    );
  }

  return direction.headVersionId;
}
