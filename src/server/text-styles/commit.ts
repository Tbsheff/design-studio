import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  Version,
  WrittenFile,
} from "./deps.js";

interface TextStyleEditScope {
  direction: Direction;
  project: Project;
  workTree: string;
}

const recordHistory = (
  deps: DirectEditDeps,
  scope: TextStyleEditScope,
  written: WrittenFile,
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: [
      {
        after: written.code,
        before: written.original,
        file: written.target.file,
        relative: written.target.relative,
      },
    ],
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const commitOne = async (
  deps: DirectEditDeps,
  scope: TextStyleEditScope,
  written: WrittenFile,
  title: string
): Promise<Version> => {
  const { direction, project } = scope;

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [written],
    title,
    { kind: "manual", prompt: `${title}: ${written.target.relative}` }
  );

  recordHistory(deps, scope, written, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const guardEdit = (deps: DirectEditDeps, scope: TextStyleEditScope): void => {
  assertCanEdit(deps, scope.project, scope.direction);
};

export { commitOne, guardEdit };

export type { TextStyleEditScope };
