import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { cleanExportPath } from "@design-studio/contracts/export";

import { firstVersionWaitText } from "../app/first-version.js";
import { resolveSource } from "../export/source.js";
import { ConflictError, NotFoundError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService, VersionStore } from "../types.js";

const LIVE_VERSION_ID = "live";

const MAX_TEXT = 262_144;

const MAX_FILES = 2000;

const SKIP = new Set([
  "node_modules",
  ".git",
  ".studio",
  "dist",
  ".vite",
  ".next",
  ".turbo",
  ".DS_Store",
]);

const TEXT_EXT = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".txt",
  ".svg",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
]);

interface FileSourceQuery {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly versionId: string | null;
}

interface FileReadQuery extends FileSourceQuery {
  readonly path: string;
}

interface FileEntry {
  readonly bytes: number;
  readonly path: string;
}

interface FileList {
  readonly files: readonly FileEntry[];
  readonly versionId: string;
}

interface FileText {
  readonly path: string;
  readonly text: string;
}

interface FileSource {
  readonly root: string;
  readonly versionId: string;
}

const NO_PREVIEW = {
  directionUrl: (): Promise<string> =>
    Promise.reject(new Error("rendering is not available")),
  snapshotUrl: (): Promise<string> =>
    Promise.reject(new Error("rendering is not available")),
};

const pickDirection = (
  project: Project,
  directionId: string | null
): Direction => {
  const direction = project.directions.find(
    (item, index) =>
      item.id === directionId || (directionId === null && index === 0)
  );

  if (!direction) {
    throw new NotFoundError("direction not found");
  }

  return direction;
};

const resolveFileSource = async (
  projects: StudioProjectStore,
  versions: VersionStore,
  preview: PreviewService | null,
  query: FileSourceQuery
): Promise<FileSource> => {
  const project = await projects.get(query.projectId);

  if (query.versionId !== null && query.versionId !== LIVE_VERSION_ID) {
    const source = await resolveSource(
      { preview: preview ?? NO_PREVIEW, projects, versions },
      project.id,
      query.versionId
    );

    return { root: source.root, versionId: source.version.id };
  }

  const direction = pickDirection(project, query.directionId);

  if (!direction.headVersionId && project.app) {
    return { root: direction.workTree, versionId: LIVE_VERSION_ID };
  }

  if (!direction.headVersionId) {
    throw new ConflictError(firstVersionWaitText(project.id));
  }

  const source = await resolveSource(
    { preview: preview ?? NO_PREVIEW, projects, versions },
    project.id,
    direction.headVersionId
  );

  return { root: source.root, versionId: source.version.id };
};

const tryRealpath = async (target: string): Promise<string | null> => {
  try {
    return await realpath(target);
  } catch {
    return null;
  }
};

const insideRoot = async (root: string, relative: string): Promise<string> => {
  const cleaned = cleanExportPath(relative);

  if (!cleaned) {
    throw new Error("path is not valid");
  }

  if (cleaned.split("/").some((part) => SKIP.has(part))) {
    throw new Error("that file is not part of the source");
  }

  const realRoot = await realpath(root);

  const full = await tryRealpath(path.join(realRoot, ...cleaned.split("/")));

  if (!full || !full.startsWith(realRoot + path.sep)) {
    throw new NotFoundError("file not found");
  }

  return full;
};

const walkFiles = async (
  root: string,
  prefix: string
): Promise<FileEntry[]> => {
  const found = await readdir(path.join(root, prefix), {
    withFileTypes: true,
  });

  const items = found.filter((item) => !SKIP.has(item.name));

  const nested = await Promise.all(
    items.map(async (item): Promise<FileEntry[]> => {
      const relative = [prefix, item.name].filter(Boolean).join("/");

      if (item.isDirectory()) {
        return walkFiles(root, relative);
      }

      if (!item.isFile()) {
        return [];
      }

      const info = await stat(path.join(root, relative));

      return [{ bytes: info.size, path: relative }];
    })
  );

  return nested.flat();
};

const readFileList = async (
  projects: StudioProjectStore,
  versions: VersionStore,
  preview: PreviewService | null,
  query: FileSourceQuery
): Promise<FileList> => {
  const source = await resolveFileSource(projects, versions, preview, query);

  const all = await walkFiles(source.root, "");

  return {
    files: all.slice(0, MAX_FILES),
    versionId: source.versionId,
  };
};

const readFileText = async (
  projects: StudioProjectStore,
  versions: VersionStore,
  preview: PreviewService | null,
  query: FileReadQuery
): Promise<FileText> => {
  const source = await resolveFileSource(projects, versions, preview, query);

  const file = await insideRoot(source.root, query.path);

  if (!TEXT_EXT.has(path.extname(file).toLowerCase())) {
    throw new Error("only text files can be read");
  }

  const info = await stat(file);

  if (info.size > MAX_TEXT) {
    throw new Error("the file is too large");
  }

  return { path: query.path, text: await readFile(file, "utf-8") };
};

export { readFileList, readFileText };

export type { FileEntry, FileList, FileReadQuery, FileSourceQuery, FileText };
