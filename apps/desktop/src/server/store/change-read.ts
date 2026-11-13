import { CHANGE_ITEM_MAX } from "@design-studio/actions/version/changes/schema";
import type { ChangedLayers } from "@design-studio/actions/version/changes/schema";
import type { Project } from "@design-studio/contracts";

import { splitHunks } from "../../shared/hunk.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { isSpanFile, toElementSpans } from "./change-spans.js";
import { toChangedLayers } from "./engine/to-changed-layers.js";
import type { FileChange } from "./engine/to-changed-layers.js";
import type { VersionReadRuntime } from "./version-read-core.js";

interface ChangeQuery {
  readonly directionId: string;
  readonly from: string | null;
  readonly projectId: string;
  readonly to: string | null;
}

interface VersionPair {
  readonly from: string;
  readonly to: string;
}

const TEXT = new TextDecoder();

const toPair = async (
  runtime: VersionReadRuntime,
  project: Project,
  query: ChangeQuery
): Promise<VersionPair> => {
  const direction = project.directions.find(
    (item) => item.id === query.directionId
  );

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  const to = query.to ?? direction.headVersionId;

  if (!to) {
    throw new NotFoundError("This direction has no saved version yet.");
  }

  if (query.from !== null) {
    return { from: query.from, to };
  }

  const version = await runtime.versions.get(project, to);

  if (!version.parentId) {
    throw new NotFoundError("This version has no parent version to compare.");
  }

  return { from: version.parentId, to };
};

const toSource = async (
  runtime: VersionReadRuntime,
  project: Project,
  versionId: string,
  file: string
): Promise<string | null> => {
  const bytes = await runtime.versions.fileAt?.(project, versionId, file);

  if (!bytes) {
    return null;
  }

  return TEXT.decode(bytes);
};

const toFileChange = async (
  runtime: VersionReadRuntime,
  project: Project,
  pair: VersionPair,
  entry: {
    readonly oldPath?: string;
    readonly patch: string;
    readonly path: string;
  }
): Promise<FileChange> => {
  const oldPath = entry.oldPath ?? entry.path;

  const [after, before] = await Promise.all([
    toSource(runtime, project, pair.to, entry.path),
    toSource(runtime, project, pair.from, oldPath),
  ]);

  return {
    after: toElementSpans(after, entry.path),
    before: toElementSpans(before, oldPath),
    file: entry.path,
    hunks: splitHunks(entry.patch),
  };
};

const inspectChangedLayers = async (
  runtime: VersionReadRuntime,
  query: ChangeQuery
): Promise<ChangedLayers> => {
  if (!runtime.versions.diffFiles) {
    throw new BadRequestError("version diffs are not available");
  }

  const project = await runtime.projects.get(query.projectId);
  const pair = await toPair(runtime, project, query);
  const diff = await runtime.versions.diffFiles(project, pair.from, pair.to);

  const changes = await Promise.all(
    diff.files.flatMap((entry) => {
      if (entry.binary || !isSpanFile(entry.path)) {
        return [];
      }

      return [toFileChange(runtime, project, pair, entry)];
    })
  );

  const found = toChangedLayers(changes, CHANGE_ITEM_MAX);

  return {
    from: pair.from,
    isTruncated: found.isTruncated || diff.truncated,
    items: found.items,
    to: pair.to,
  };
};

export { inspectChangedLayers };

export type { ChangeQuery };
