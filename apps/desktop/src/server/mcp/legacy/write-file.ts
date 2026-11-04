import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project, Version } from "@design-studio/contracts";

import { firstVersionBlock } from "../../app/first-version.js";
import { publishVersion } from "../../direct-edit/index.js";
import { EditError, loadTarget, refuseWhileRunning } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import {
  checkWritePath,
  ok,
  plain,
  versionActivity,
  writeText,
} from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { unchangedResult, writtenResult } from "./direct-edit-result.js";
import type { WriteFileInput } from "./direct-edit-schema.js";

interface WriteTarget {
  project: Project;
  direction: Direction;
  file: string;
  relative: string;
}

const FIRST_VERSION_WAIT_MS = 20_000;

const readBefore = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const writeVerb = (before: string | null): string => {
  if (before === null) {
    return "Created";
  }

  return "Wrote";
};

const shareVersion = async (
  deps: EditDeps,
  target: WriteTarget,
  version: Version
): Promise<void> => {
  await publishVersion(
    {
      bus: deps.bus,
      projects: deps.projects,
      runner: deps.runner,
      versions: deps.versions,
    },
    target.project,
    target.direction,
    version
  );
};

const saveWrite = async (
  deps: EditDeps,
  target: WriteTarget,
  client: string
): Promise<Version | null> => {
  const { project, direction, relative } = target;

  const version = await deps.versions.commitFile(
    project,
    direction,
    relative,
    `Edit by ${client}`,
    { kind: "manual", prompt: `Edit by ${client}: ${relative}` }
  );

  return version;
};

const recordWrite = (
  deps: EditDeps,
  target: WriteTarget,
  version: Version,
  change: { before: string; after: string }
): void => {
  deps.history?.record({
    directionId: target.direction.id,
    files: [{ ...change, file: target.file, relative: target.relative }],
    label: version.title,
    projectId: target.project.id,
    versionId: version.id,
  });
};

const writeTarget = async (
  deps: EditDeps,
  input: WriteFileInput
): Promise<WriteTarget> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  refuseWhileRunning(deps, project, direction);

  const relative = checkWritePath(project, direction.workTree, input.path);

  const file = path.join(direction.workTree, ...relative.split("/"));

  return { direction, file, project, relative };
};

const writeProjectFile = async (
  deps: EditDeps,
  input: WriteFileInput,
  client: string
): Promise<Done> => {
  const target = await writeTarget(deps, input);

  const before = await readBefore(target.file);

  if (before === input.content) {
    return plain(
      ok(unchangedResult(target.relative, target.direction.headVersionId))
    );
  }

  const blocked = await firstVersionBlock(
    target.project,
    FIRST_VERSION_WAIT_MS
  );

  if (blocked) {
    throw new EditError(blocked);
  }

  await writeText(target.file, input.content);

  const version = await saveWrite(deps, target, client);

  if (version && before !== null) {
    recordWrite(deps, target, version, { after: input.content, before });
  }

  if (version) {
    await shareVersion(deps, target, version);
  }

  return {
    activity: versionActivity(
      target.project,
      target.direction,
      `${writeVerb(before)} ${target.relative}`,
      version
    ),
    result: ok(writtenResult(target.relative, before === null, version)),
  };
};

export { writeProjectFile };
