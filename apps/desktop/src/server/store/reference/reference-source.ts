import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { BadRequestError } from "../../platform/errors/index.js";
import { isSafeEntryPath } from "./engine/is-safe-entry-path.js";
import {
  MAX_ARCHIVE_BYTES,
  MAX_WALK_FILES,
} from "./engine/reference-limits.js";
import { isSkippedDirectory, toExtension } from "./engine/to-entry-kind.js";

interface SourceEntry {
  readonly bytes: number | null;
  readonly read: () => Promise<Buffer>;
  readonly relativePath: string;
}

interface LoadedSource {
  readonly entries: readonly SourceEntry[];
  readonly source: "file" | "folder" | "zip";
  readonly stem: string;
}

const SKIPPED_ARCHIVE_TOP = "__MACOSX";

const ZIP_SUFFIX = ".zip";

const toFileEntry = (fileName: string, buffer: Buffer): SourceEntry => ({
  bytes: buffer.length,
  read: () => Promise.resolve(buffer),
  relativePath: fileName,
});

const toTopFolder = (names: readonly string[]): string | null => {
  const tops = new Set(names.map((name) => name.split("/")[0] ?? ""));
  const [only = null] = [...tops];

  if (tops.size !== 1 || only === null) {
    return null;
  }

  if (names.every((name) => name.startsWith(`${only}/`))) {
    return only;
  }

  return null;
};

const toStrippedName = (name: string, top: string | null): string => {
  if (top === null) {
    return name;
  }

  return name.slice(top.length + 1);
};

const getArchive = async (buffer: Buffer): Promise<JSZip> => {
  try {
    return await JSZip.loadAsync(buffer);
  } catch {
    throw new BadRequestError("The zip file cannot be read.");
  }
};

const getZipSource = async (
  buffer: Buffer,
  stem: string
): Promise<LoadedSource> => {
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw new BadRequestError("The zip is over 100 MB. Use a smaller zip.");
  }

  const zip = await getArchive(buffer);

  const files = Object.values(zip.files).filter(
    (file) => !(file.dir || file.name.startsWith(`${SKIPPED_ARCHIVE_TOP}/`))
  );

  if (files.some((file) => !isSafeEntryPath(file.name))) {
    throw new BadRequestError("The zip has a path that leaves its folder.");
  }

  const top = toTopFolder(files.map((file) => file.name));

  const entries = files.map((file): SourceEntry => ({
    bytes: null,
    read: () => file.async("nodebuffer"),
    relativePath: toStrippedName(file.name, top),
  }));

  return { entries, source: "zip", stem: top ?? stem };
};

const listFolderEntries = async (
  root: string,
  relativeDir: string
): Promise<SourceEntry[]> => {
  const children = await readdir(path.join(root, relativeDir), {
    withFileTypes: true,
  });

  const nested = await Promise.all(
    children.map(async (child): Promise<SourceEntry[]> => {
      const relativePath = path.posix.join(relativeDir, child.name);

      if (child.isDirectory() && !isSkippedDirectory(child.name)) {
        return listFolderEntries(root, relativePath);
      }

      if (!child.isFile()) {
        return [];
      }

      const absolute = path.join(root, relativePath);
      const info = await stat(absolute);

      return [
        { bytes: info.size, read: () => readFile(absolute), relativePath },
      ];
    })
  );

  return nested.flat().slice(0, MAX_WALK_FILES);
};

const getFolderSource = async (folder: string): Promise<LoadedSource> => ({
  entries: await listFolderEntries(folder, ""),
  source: "folder",
  stem: path.basename(folder),
});

const getStatOrNull = async (
  target: string
): Promise<{
  readonly isDirectory: boolean;
} | null> => {
  try {
    const info = await stat(target);

    return { isDirectory: info.isDirectory() };
  } catch {
    return null;
  }
};

const getBufferSource = (
  name: string,
  buffer: Buffer
): Promise<LoadedSource> => {
  if (toExtension(name) === "zip") {
    return getZipSource(buffer, name.slice(0, -ZIP_SUFFIX.length));
  }

  return Promise.resolve({
    entries: [toFileEntry(name, buffer)],
    source: "file",
    stem: name,
  });
};

const getPathSource = async (sourcePath: string): Promise<LoadedSource> => {
  if (!path.isAbsolute(sourcePath)) {
    throw new BadRequestError("The path must be an absolute path.");
  }

  const info = await getStatOrNull(sourcePath);

  if (info === null) {
    throw new BadRequestError("The path does not exist.");
  }

  if (info.isDirectory) {
    return getFolderSource(sourcePath);
  }

  return getBufferSource(path.basename(sourcePath), await readFile(sourcePath));
};

const getDataSource = (fileName: string, data: string): Promise<LoadedSource> =>
  getBufferSource(path.basename(fileName), Buffer.from(data, "base64"));

export { getDataSource, getPathSource };

export type { LoadedSource, SourceEntry };
