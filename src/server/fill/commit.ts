import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  Version,
  WrittenFile,
} from "./deps.js";

interface FillEditScope {
  direction: Direction;
  project: Project;
  workTree: string;
}

const recordHistory = (
  deps: DirectEditDeps,
  scope: FillEditScope,
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

const commitAll = async (
  deps: DirectEditDeps,
  scope: FillEditScope,
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

  recordHistory(deps, scope, written, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const guardEdit = (deps: DirectEditDeps, scope: FillEditScope): void => {
  assertCanEdit(deps, scope.project, scope.direction);
};

export { commitAll, guardEdit };

export type { FillEditScope };
