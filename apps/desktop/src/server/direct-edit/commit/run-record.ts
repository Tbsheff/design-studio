import path from "node:path";

import type { Direction, Project, Version } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import { LINKS_FILE } from "@design-studio/contracts/links";

import type { VersionStore } from "../../../shared/server-ports.js";
import type { EditFileChange } from "../../events/index.js";
import type { EditHistory } from "./history.js";

const MAX_RUN_FILES = 50;
const MAX_RUN_BYTES = 4 * 1024 * 1024;
const MAX_RUN_CHAIN = 500;
const decoder = new TextDecoder("utf-8", { fatal: true });
const LAYOUT_FILES_IN_EVERY_VERSION = new Set([CANVAS_FILE, LINKS_FILE]);

function textOf(bytes: Uint8Array | null): string | null | undefined {
  if (bytes === null) {
    return null;
  }

  try {
    return decoder.decode(bytes);
  } catch {
    return undefined;
  }
}

type FileAt = NonNullable<VersionStore["fileAt"]>;

interface RunSpan {
  readonly baseId: string;
  readonly direction: Direction;
  readonly project: Project;
  readonly relatives: readonly string[];
  readonly versionId: string;
}

interface PortRunTarget {
  readonly baseId: string;
  readonly direction: Direction;
  readonly project: Project;
  readonly since: number;
  readonly versionId: string;
}

async function changeOf(
  fileAt: FileAt,
  span: RunSpan,
  relative: string
): Promise<EditFileChange | null> {
  const { direction, project } = span;
  const [before, after] = await Promise.all([
    fileAt(project, span.baseId, relative),
    fileAt(project, span.versionId, relative),
  ]).then(([a, b]) => [textOf(a), textOf(b)]);

  if (before === undefined || after === undefined || after === null) {
    return null;
  }

  return {
    file: path.join(direction.workTree, relative),
    relative,
    before: before ?? "",
    after,
    ...(before === null ? { created: true } : {}),
  };
}

function isComplete(version: Version): boolean {
  const total = version.changedFilesTotal ?? version.changedFiles.length;

  return version.changedFiles.length >= total;
}

async function toSpanChanges(
  versions: VersionStore,
  span: RunSpan
): Promise<EditFileChange[] | null> {
  const fileAt = versions.fileAt?.bind(versions);
  const total = span.relatives.length;

  if (!fileAt || total === 0 || total > MAX_RUN_FILES) {
    return null;
  }

  const changes = await Promise.all(
    span.relatives
      .filter((relative) => !LAYOUT_FILES_IN_EVERY_VERSION.has(relative))
      .map((relative) => changeOf(fileAt, span, relative))
  );

  if (changes.some((change) => change === null)) {
    return null;
  }

  const files = changes as EditFileChange[];

  const bytes = files.reduce(
    (sum, change) => sum + change.before.length + change.after.length,
    0
  );

  return bytes > MAX_RUN_BYTES ? null : files;
}

function runChanges(
  versions: VersionStore,
  project: Project,
  direction: Direction,
  version: Version & { parentId: string }
): Promise<EditFileChange[] | null> {
  if (!isComplete(version)) {
    return Promise.resolve(null);
  }

  return toSpanChanges(versions, {
    direction,
    project,
    baseId: version.parentId,
    relatives: version.changedFiles,
    versionId: version.id,
  });
}

function toChainFiles(
  list: readonly Version[],
  versionId: string,
  baseId: string
): string[] | null {
  const byId = new Map(list.map((item) => [item.id, item]));
  const files = new Set<string>();
  let current = byId.get(versionId);

  for (let step = 0; step < MAX_RUN_CHAIN; step += 1) {
    if (current === undefined || !isComplete(current)) {
      return null;
    }

    if (current.id === baseId) {
      return [...files];
    }

    for (const relative of current.changedFiles) {
      files.add(relative);
    }

    current = byId.get(current.parentId ?? "");
  }

  return null;
}

function hasParent(
  version: Version | undefined
): version is Version & { parentId: string } {
  return version !== undefined && version.parentId !== null;
}

async function applyPortRunHistory(
  history: EditHistory,
  versions: VersionStore,
  target: PortRunTarget
): Promise<void> {
  const { direction, project } = target;
  const list = await versions.list(project, direction);
  const version = list.find((item) => item.id === target.versionId);
  const relatives = toChainFiles(list, target.versionId, target.baseId);

  const files =
    relatives === null
      ? null
      : await toSpanChanges(versions, { ...target, relatives }).catch(
          () => null
        );

  if (!version || !files) {
    history.clear(project.id, direction.id);

    return;
  }

  history.dropSince(project.id, direction.id, target.since);
  history.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files,
  });
}

async function recordRunInHistory(
  history: EditHistory,
  versions: VersionStore,
  project: Project,
  direction: Direction,
  versionId: string
): Promise<void> {
  const version = (await versions.list(project, direction)).find(
    (item) => item.id === versionId
  );

  const files = hasParent(version)
    ? await runChanges(versions, project, direction, version).catch(() => null)
    : null;

  if (!version || !files) {
    history.clear(project.id, direction.id);

    return;
  }

  history.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files,
  });
}

export { applyPortRunHistory, recordRunInHistory };
