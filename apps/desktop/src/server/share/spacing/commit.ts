import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  Version,
  WrittenFile,
} from "./deps.js";

interface SpacingScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

const toRecordHistory = (
  deps: DirectEditDeps,
  scope: SpacingScope,
  written: readonly WrittenFile[],
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

const toCommitSpacing = async (
  deps: DirectEditDeps,
  scope: SpacingScope,
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

const toGuardSpacingEdit = (
  deps: DirectEditDeps,
  scope: SpacingScope
): void => {
  assertCanEdit(deps, scope.project, scope.direction);
};

export {
  toCommitSpacing as commitSpacing,
  toGuardSpacingEdit as guardSpacingEdit,
};

export type { SpacingScope };
