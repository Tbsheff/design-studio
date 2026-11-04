import path from "node:path";

import {
  assertCanEdit,
  publishVersion,
  savesSettled,
  writeAndCommitAll,
} from "./deps.js";
import type { VersionMeta } from "./deps.js";
import type { PropWork } from "./prop-plan.js";
import type { PropRun } from "./prop-runtime.js";

const applyWork = async (run: PropRun, work: PropWork): Promise<string> => {
  const { direction, project } = run.scope;
  const { editDeps } = run.runtime;

  assertCanEdit(editDeps, project, direction);
  await savesSettled(project.id);

  const files = work.changes.map((change) => ({
    after: change.after,
    before: change.before,
    file: path.join(direction.workTree, change.relative),
    relative: change.relative,
  }));

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${work.title}: ${work.changes.map((change) => change.relative).join(", ")}`,
  };

  const version = await writeAndCommitAll(
    editDeps,
    project,
    direction,
    files.map((file) => ({
      code: file.after,
      original: file.before,
      target: { file: file.file, relative: file.relative },
    })),
    work.title,
    meta
  );

  const directionId = direction.id;
  const label = work.title;
  const projectId = project.id;
  const versionId = version.id;

  editDeps.history?.record({
    directionId,
    files,
    label,
    projectId,
    versionId,
  });
  await publishVersion(editDeps, project, direction, version);

  return versionId;
};

export { applyWork };
