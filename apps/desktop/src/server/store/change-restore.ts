import { readFile } from "node:fs/promises";

import type {
  ChangeKind,
  RestoredChange,
} from "@design-studio/actions/version/changes/schema";
import type { Direction, Project } from "@design-studio/contracts";

import { splitHunks } from "../../shared/hunk.js";
import type { PatchHunk } from "../../shared/hunk.js";
import {
  assertCanEdit,
  publishVersion,
  resolveSource,
  saveDeferred,
  savesSettled,
  writeAtomic,
} from "../direct-edit/commit/index.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../platform/errors/index.js";
import { runFileLockGuard } from "../platform/path-lock/index.js";
import { isSpanFile, toElementSpans } from "./change-spans.js";
import { toRestoredLayer } from "./engine/to-restored-layer.js";
import type { LayerRestoreResult } from "./engine/to-restored-layer.js";
import type { VersionWriteRuntime } from "./version-write-core.js";

interface ChangeRestoreQuery {
  readonly directionId: string;
  readonly file: string;
  readonly kind: ChangeKind;
  readonly layerId: string;
  readonly projectId: string;
  readonly versionId: string;
}

interface VersionTexts {
  readonly from: string;
  readonly hunks: readonly PatchHunk[];
  readonly to: string;
}

const TEXT = new TextDecoder();

const SHORT_ID = 7;

const CHANGED =
  "The layer changed again after this version. Use revert_hunk to undo the whole change.";

const UNSUPPORTED =
  "This removed layer shared its lines with other changes. Use revert_hunk to undo the whole change.";

const toLayerMissing = (layerId: string): string =>
  `${layerId} is not a changed layer of this version. Use inspect_changes_version to get the layer ids.`;

const toVersionText = async (
  runtime: VersionWriteRuntime,
  project: Project,
  versionId: string,
  file: string
): Promise<string> => {
  const bytes = await runtime.versions.fileAt?.(project, versionId, file);

  if (!bytes) {
    throw new NotFoundError(`${file} is not in version ${versionId}.`);
  }

  return TEXT.decode(bytes);
};

const toVersionTexts = async (
  runtime: VersionWriteRuntime,
  project: Project,
  query: ChangeRestoreQuery
): Promise<VersionTexts> => {
  const version = await runtime.versions.get(project, query.versionId);

  if (!version.parentId || !runtime.versions.diffFiles) {
    throw new BadRequestError(
      "This version has no earlier version to compare with."
    );
  }

  const diff = await runtime.versions.diffFiles(
    project,
    version.parentId,
    query.versionId
  );

  const entry = diff.files.find((item) => item.path === query.file);

  if (!entry || entry.binary) {
    throw new NotFoundError(`${query.file} has no changes in this version.`);
  }

  const [from, to] = await Promise.all([
    toVersionText(runtime, project, version.parentId, query.file),
    toVersionText(runtime, project, query.versionId, query.file),
  ]);

  const hunks = splitHunks(entry.patch);

  return { from, hunks, to };
};

const toRestoredText = (
  result: LayerRestoreResult,
  query: ChangeRestoreQuery
): string => {
  if (result.ok) {
    return result.source;
  }

  if (result.code === "changed") {
    throw new ConflictError(CHANGED);
  }

  if (result.code === "unsupported") {
    throw new BadRequestError(UNSUPPORTED);
  }

  throw new NotFoundError(toLayerMissing(query.layerId));
};

const toTitle = (query: ChangeRestoreQuery, relative: string): string => {
  const name = relative.split("/").pop() ?? relative;

  return `Undo ${query.kind} change of ${query.layerId.split(":").slice(1).join(":")} in ${name}`;
};

const restoreInDirection = async (
  runtime: VersionWriteRuntime,
  query: ChangeRestoreQuery,
  project: Project,
  direction: Direction
): Promise<RestoredChange> => {
  const deps = runtime.editDeps;
  assertCanEdit(deps, project, direction);
  const texts = await toVersionTexts(runtime, project, query);
  await savesSettled(project.id);
  const target = await resolveSource(direction.workTree, query.file);
  await runFileLockGuard(project.id, direction.id, [target.relative]);
  const headText = await readFile(target.file, "utf-8");

  const next = toRestoredText(
    toRestoredLayer({
      from: texts.from,
      fromSpans: toElementSpans(texts.from, query.file),
      head: headText,
      headSpans: toElementSpans(headText, query.file),
      hunks: texts.hunks,
      kind: query.kind,
      layerId: query.layerId,
      to: texts.to,
      toSpans: toElementSpans(texts.to, query.file),
    }),
    query
  );

  await writeAtomic(target.file, next);
  const title = toTitle(query, target.relative);

  const version = saveDeferred(
    deps,
    project,
    direction,
    [target.relative],
    title,
    {
      kind: "manual",
      prompt: `${title}, from version ${query.versionId.slice(0, SHORT_ID)}`,
    }
  );

  deps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: next,
        before: headText,
        file: target.file,
        relative: target.relative,
      },
    ],
    label: title,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(deps, project, direction, version);

  return { file: target.relative, kind: query.kind, versionId: version.id };
};

const restoreLayerChange = async (
  runtime: VersionWriteRuntime,
  query: ChangeRestoreQuery
): Promise<RestoredChange> => {
  if (!isSpanFile(query.file)) {
    throw new BadRequestError(
      `${query.file} is not an HTML or JSX file. Use revert_hunk.`
    );
  }

  return await runtime.withDirection(
    query.projectId,
    query.directionId,
    (project, direction) =>
      restoreInDirection(runtime, query, project, direction)
  );
};

export { restoreLayerChange };

export type { ChangeRestoreQuery };
