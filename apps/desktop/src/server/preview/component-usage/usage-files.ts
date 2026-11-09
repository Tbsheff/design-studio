import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  ".git",
  ".next",
  ".studio",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const SOURCE_PATTERN = /\.(?:jsx|tsx|ts|js)$/u;
const SKIPPED_FILE_PATTERN = /\.(?:test|spec|stories|story|d)\.[jt]sx?$/u;
const MAX_FILES = 20_000;
const KILOBYTE = 1024;
const MAX_KILOBYTES = 512;
const MAX_BYTES = MAX_KILOBYTES * KILOBYTE;

const isScannable = (name: string): boolean =>
  SOURCE_PATTERN.test(name) && !SKIPPED_FILE_PATTERN.test(name);

const listEntries = async (folder: string): Promise<Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

const listFolder = async (folder: string): Promise<string[]> => {
  const entries = await listEntries(folder);

  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const absolute = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) {
          return [];
        }

        return await listFolder(absolute);
      }

      if (entry.isFile() && isScannable(entry.name)) {
        return [absolute];
      }

      return [];
    })
  );

  return nested.flat();
};

const listSourceFiles = async (
  folders: readonly string[]
): Promise<string[]> => {
  const found = await Promise.all(folders.map((folder) => listFolder(folder)));

  return [...new Set(found.flat())].toSorted().slice(0, MAX_FILES);
};

const getSourceText = async (absolute: string): Promise<string | null> => {
  try {
    const info = await stat(absolute);

    if (!info.isFile() || info.size > MAX_BYTES) {
      return null;
    }

    return await readFile(absolute, "utf-8");
  } catch {
    return null;
  }
};

const getMissingTexts = async (
  known: ReadonlyMap<string, string>,
  files: readonly string[]
): Promise<Map<string, string>> => {
  const texts = new Map(known);
  const missing = files.filter((file) => !texts.has(file));

  const loaded = await Promise.all(
    missing.map(async (file) => ({ file, text: await getSourceText(file) }))
  );

  for (const { file, text } of loaded) {
    if (text !== null) {
      texts.set(file, text);
    }
  }

  return texts;
};

export { listSourceFiles, getMissingTexts };
