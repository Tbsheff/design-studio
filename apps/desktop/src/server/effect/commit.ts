import { assertCanEdit, publishVersion, writeAndCommitAll } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  Version,
  WrittenFile,
} from "./deps.js";

interface EffectEditScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

const createHistoryRecord = (
  deps: DirectEditDeps,
  scope: EffectEditScope,
  written: readonly WrittenFile[],
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: written.map((entry) => ({
      after: entry.code,
      before: entry.original,
      created: entry.created === true,
      file: entry.target.file,
      relative: entry.target.relative,
    })),
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const runCommit = async (
  deps: DirectEditDeps,
  scope: EffectEditScope,
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

  createHistoryRecord(deps, scope, written, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const applyEditGuard = (deps: DirectEditDeps, scope: EffectEditScope): void => {
  assertCanEdit(deps, scope.project, scope.direction);
};

export { runCommit, applyEditGuard };

export type { EffectEditScope };
