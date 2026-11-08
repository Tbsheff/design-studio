import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  Version,
  WrittenFile,
} from "./deps.js";

interface MotionEditScope {
  direction: Direction;
  project: Project;
  workTree: string;
}

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: MotionEditScope,
  written: WrittenFile[],
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: written.map((entry) => ({
      after: entry.code,
      before: entry.original,
      file: entry.target.file,
      relative: entry.target.relative,
    })),
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const toCommitAll = async (
  deps: DirectEditDeps,
  scope: MotionEditScope,
  written: WrittenFile[],
  title: string
): Promise<Version> => {
  const { direction, project } = scope;
  const files = written.map((entry) => entry.target.relative).join(", ");

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    written,
    title,
    { kind: "manual", prompt: `${title}: ${files}` }
  );

  toRecordHistory(deps, scope, written, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const toGuardEdit = (deps: DirectEditDeps, scope: MotionEditScope): void => {
  assertCanEdit(deps, scope.project, scope.direction);
};

export { toCommitAll as commitAll, toGuardEdit as guardEdit };

export type { MotionEditScope };
