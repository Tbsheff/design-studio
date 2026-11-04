import type {
  Direction,
  EditHistoryList,
  EditHistoryState,
  Project,
  Version,
  VersionChanges,
} from "../../shared/contracts.js";
import { splitHunks } from "../../shared/hunk.js";
import type { PatchHunk } from "../../shared/hunk.js";
import { savesSettled } from "../direct-edit/commit/index.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { trimListedFiles } from "./version-names.js";
import type { VersionReadRuntime, VersionTarget } from "./version-read-core.js";

const HISTORY_LIMIT_DEFAULT = 20;

const HISTORY_LIMIT_MAX = 50;

interface DirectionQuery {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface ChangesQuery extends DirectionQuery {
  readonly from: string;
  readonly isThumbs: boolean;
  readonly to: string | null;
}

interface HistoryQuery {
  readonly directionId: string;
  readonly limit: number | null;
  readonly projectId: string;
}

interface HunkQuery {
  readonly file: string;
  readonly from: string;
  readonly projectId: string;
  readonly to: string;
}

interface HunkList {
  readonly file: string;
  readonly from: string;
  readonly hunks: readonly PatchHunk[];
  readonly to: string;
}

type HistoryView = EditHistoryState & EditHistoryList;

const pickDirection = (
  runtime: VersionReadRuntime,
  project: Project,
  directionId: string | null
): Direction | undefined => {
  if (directionId === null) {
    return runtime.projects.mainDirection(project);
  }

  return project.directions.find((item) => item.id === directionId);
};

const readTarget = async (
  runtime: VersionReadRuntime,
  query: DirectionQuery
): Promise<VersionTarget> => {
  const project = await runtime.projects.get(query.projectId);

  const direction = pickDirection(runtime, project, query.directionId);

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  return { direction, project };
};

const readVersionList = async (
  runtime: VersionReadRuntime,
  query: DirectionQuery
): Promise<readonly Version[]> => {
  const { direction, project } = await readTarget(runtime, query);

  return trimListedFiles(
    await runtime.names.apply(
      project.id,
      await runtime.versions.list(project, direction)
    )
  );
};

const readVersion = async (
  runtime: VersionReadRuntime,
  projectId: string,
  versionId: string
): Promise<Version> => {
  const project = await runtime.projects.get(projectId);
  const version = await runtime.versions.get(project, versionId);

  const [named] = trimListedFiles(
    await runtime.names.apply(project.id, [version])
  );

  return named ?? version;
};

const readChanges = async (
  runtime: VersionReadRuntime,
  query: ChangesQuery
): Promise<VersionChanges> => {
  const { direction, project } = await readTarget(runtime, query);
  const to = query.to ?? direction.headVersionId;

  if (!to) {
    throw new NotFoundError("This direction has no saved version yet.");
  }

  if (!runtime.versions.diffFiles) {
    throw new BadRequestError("version diffs are not available");
  }

  const changes = await runtime.versions.diffFiles(project, query.from, to);

  if (!query.isThumbs) {
    return changes;
  }

  return { ...changes, thumbs: await runtime.thumbs(project, query.from, to) };
};

const readHistory = async (
  runtime: VersionReadRuntime,
  query: HistoryQuery
): Promise<HistoryView> => {
  const { direction, project } = await readTarget(runtime, query);

  const limit = Math.min(
    HISTORY_LIMIT_MAX,
    Math.max(1, query.limit ?? HISTORY_LIMIT_DEFAULT)
  );

  await savesSettled(project.id);

  return {
    ...runtime.history.state(project.id, direction.id),
    ...(runtime.history.list?.(project.id, direction.id, limit) ?? {
      redo: [],
      undo: [],
    }),
  };
};

const readHunks = async (
  runtime: VersionReadRuntime,
  query: HunkQuery
): Promise<HunkList> => {
  if (!runtime.versions.diffFiles) {
    throw new BadRequestError("version diffs are not available");
  }

  const project = await runtime.projects.get(query.projectId);

  const changes = await runtime.versions.diffFiles(
    project,
    query.from,
    query.to
  );

  const found = changes.files.find((item) => item.path === query.file);

  if (!found) {
    throw new NotFoundError(`${query.file} did not change in this diff`);
  }

  return {
    file: found.path,
    from: query.from,
    hunks: splitHunks(found.patch),
    to: query.to,
  };
};

export { readChanges, readHistory, readHunks, readVersion, readVersionList };

export type {
  ChangesQuery,
  DirectionQuery,
  HistoryQuery,
  HistoryView,
  HunkList,
  HunkQuery,
};
