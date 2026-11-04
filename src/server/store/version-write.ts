import type {
  Direction,
  EditSessionEnd,
  Project,
  Version,
  VersionMeta,
} from "../../shared/contracts.js";
import type { HunkRevertRequest, HunkRevertResult } from "../../shared/hunk.js";
import type {
  EditStepResult,
  HistoryStep,
} from "../direct-edit/commit/index.js";
import {
  assertCanEdit,
  publishVersion,
  recordRunInHistory,
  revertHunk,
} from "../direct-edit/commit/index.js";
import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import { parseVersionName } from "./version-names.js";
import type { VersionWriteRuntime } from "./version-write-core.js";

const MAX_LISTED = 12;

interface DirectionRef {
  readonly directionId: string;
  readonly projectId: string;
}

interface SessionEndQuery extends DirectionRef {
  readonly action: "discard" | "save";
  readonly baseVersionId: string;
}

interface HunkRevertQuery extends DirectionRef {
  readonly file: string;
  readonly from: string | null;
  readonly hunk: number;
  readonly versionId: string;
}

interface RenameQuery {
  readonly name: string | null;
  readonly projectId: string;
  readonly versionId: string;
}

interface RestoreQuery extends DirectionRef {
  readonly versionId: string;
}

interface Renamed {
  readonly id: string;
  readonly name: string | null;
}

const sessionTitle = (titles: readonly string[]): string => {
  if (titles.length === 1) {
    return titles[0] ?? "Edit";
  }

  return `Edit session: ${titles.length} edits`;
};

const sessionMeta = (titles: readonly string[]): VersionMeta => {
  const listed = titles.slice(0, MAX_LISTED).join("; ");

  const extra = Math.max(0, titles.length - MAX_LISTED);
  let more = "";

  if (extra > 0) {
    more = ` (+${extra} more)`;
  }

  return { kind: "manual", prompt: `Edit session: ${listed}${more}` };
};

const writeRename = async (
  runtime: VersionWriteRuntime,
  query: RenameQuery
): Promise<Renamed> => {
  const name = parseVersionName(query.name);
  const project = await runtime.projects.get(query.projectId);
  const version = await runtime.versions.get(project, query.versionId);

  return {
    id: version.id,
    name: await runtime.names.set(project.id, version.id, name),
  };
};

const writeStep = (
  runtime: VersionWriteRuntime,
  query: DirectionRef,
  kind: HistoryStep
): Promise<EditStepResult> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    (project, direction) =>
      runtime.history.step(kind, runtime.editDeps, project, direction)
  );

const toHunkRequest = (query: HunkRevertQuery): HunkRevertRequest => {
  const request: HunkRevertRequest = {
    file: query.file,
    hunk: query.hunk,
    to: query.versionId,
  };

  if (query.from) {
    request.from = query.from;
  }

  return request;
};

const writeRevertHunk = (
  runtime: VersionWriteRuntime,
  query: HunkRevertQuery
): Promise<HunkRevertResult> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    (project, direction) =>
      revertHunk(runtime.editDeps, project, direction, toHunkRequest(query))
  );

const writeRestore = (
  runtime: VersionWriteRuntime,
  query: RestoreQuery
): Promise<Version> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    async (project, direction) => {
      const restored = await runtime.versions.restore(
        project,
        direction,
        query.versionId,
        "restore"
      );

      await runtime.recordVersion(project, direction, restored, "restore");

      try {
        await recordRunInHistory(
          runtime.history,
          runtime.versions,
          project,
          direction,
          restored.id
        );
      } catch {
        runtime.history.clear(project.id, direction.id);
      }

      await runtime.syncPackId(project, direction);
      await runtime.emitStatus(project, direction);

      return restored;
    }
  );

const moveHead = async (
  runtime: VersionWriteRuntime,
  project: Project,
  direction: Direction,
  head: string
): Promise<void> => {
  const { editDeps } = runtime;

  const updated = await editDeps.projects.updateDirection(
    project.id,
    direction.id,
    { headVersionId: head }
  );

  editDeps.bus.emit({
    direction: updated,
    directionId: direction.id,
    projectId: project.id,
    type: "direction.updated",
  });

  const nextStatus = await editDeps.versions.status(project, direction);

  editDeps.bus.emit({
    directionId: direction.id,
    projectId: project.id,
    status: nextStatus,
    type: "status.changed",
  });
};

const finishSession = async (
  runtime: VersionWriteRuntime,
  target: { direction: Direction; project: Project },
  count: number,
  version: Version | null
): Promise<void> => {
  if (count === 0) {
    return;
  }

  const { editDeps, history } = runtime;
  const { direction, project } = target;

  history.forget(project.id, direction.id);

  if (version) {
    try {
      await recordRunInHistory(
        history,
        editDeps.versions,
        project,
        direction,
        version.id
      );
    } catch {
      history.forget(project.id, direction.id);
    }
  }

  editDeps.bus.emit({
    directionId: direction.id,
    projectId: project.id,
    type: "versions.changed",
  });
};

const endSessionIn = async (
  runtime: VersionWriteRuntime,
  query: SessionEndQuery,
  project: Project,
  direction: Direction
): Promise<EditSessionEnd> => {
  const { editDeps } = runtime;
  const store = editDeps.versions;

  if (!store.sessionSince || !store.endSession) {
    throw new BadRequestError("Edit sessions are not supported");
  }

  assertCanEdit(editDeps, project, direction);

  const base = query.baseVersionId;
  const span = await store.sessionSince(project, direction, base);

  if (span.foreign !== null) {
    if (query.action === "discard") {
      throw new ConflictError(span.foreign);
    }

    return { headVersionId: direction.headVersionId ?? base, version: null };
  }

  const ended = await store.endSession(
    project,
    direction,
    base,
    query.action,
    sessionTitle(span.titles),
    sessionMeta(span.titles)
  );

  if (ended.version) {
    await publishVersion(editDeps, project, direction, ended.version);
  }

  if (!ended.version && ended.head !== direction.headVersionId) {
    await moveHead(runtime, project, direction, ended.head);
  }

  if (query.action === "discard" && ended.changed.length > 0) {
    runtime.onRestored(direction.workTree, ended.changed);
  }

  if (ended.remapped) {
    runtime.onRemapped(project.id, ended.remapped);
  }

  await finishSession(
    runtime,
    { direction, project },
    span.count,
    ended.version
  );

  return { headVersionId: ended.head, version: ended.version };
};

const writeEndSession = (
  runtime: VersionWriteRuntime,
  query: SessionEndQuery
): Promise<EditSessionEnd> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    (project, direction) => endSessionIn(runtime, query, project, direction)
  );

export {
  writeEndSession,
  writeRename,
  writeRestore,
  writeRevertHunk,
  writeStep,
};

export type {
  DirectionRef,
  HunkRevertQuery,
  RenameQuery,
  Renamed,
  RestoreQuery,
  SessionEndQuery,
};
