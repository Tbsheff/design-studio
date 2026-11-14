import type { Dirent, Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { RawElement } from "./engine/index.js";
import { listRawElements } from "./scan-elements.js";
import type { Ts } from "./ts-type.js";

interface Scanned {
  readonly elements: readonly RawElement[];
  readonly stamp: string;
}

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

const SOURCE_PATTERN = /\.(?:tsx|jsx)$/u;
const SKIPPED_FILE_PATTERN = /\.(?:test|spec|stories|story)\.[jt]sx$/u;
const TAG_PATTERN = /<(?:a|button|input|label|select|table|textarea)[\s/>]/u;
const MAX_FILES = 6000;
const PAGE_FILE_PATTERN = /\.html?$/u;
const DESIGN_SYSTEM_DIR = "design-system";
const MAX_PAGES = 40;
const KILOBYTE = 1024;
const MAX_KILOBYTES = 512;
const MAX_BYTES = MAX_KILOBYTES * KILOBYTE;
const MAX_CACHE = 8000;
const cache = new Map<string, Scanned>();

const isScannable = (name: string): boolean =>
  SOURCE_PATTERN.test(name) && !SKIPPED_FILE_PATTERN.test(name);

const listEntries = async (folder: string): Promise<Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

const getStat = async (absolute: string): Promise<Stats | null> => {
  try {
    return await stat(absolute);
  } catch {
    return null;
  }
};

const listFolder = async (
  folder: string,
  isSkipped: (absolute: string) => boolean,
  isWanted: (name: string) => boolean
): Promise<string[]> => {
  const entries = await listEntries(folder);

  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const absolute = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name) || isSkipped(absolute)) {
          return [];
        }

        return await listFolder(absolute, isSkipped, isWanted);
      }

      if (entry.isFile() && isWanted(entry.name)) {
        return [absolute];
      }

      return [];
    })
  );

  return nested.flat();
};

const listSourceFiles = async (
  root: string,
  isSkipped: (absolute: string) => boolean
): Promise<string[]> => {
  const found = await listFolder(root, isSkipped, isScannable);

  return found.toSorted().slice(0, MAX_FILES);
};

const listPageFiles = async (root: string): Promise<string[]> => {
  const kitFolder = path.join(root, DESIGN_SYSTEM_DIR);

  const found = await listFolder(
    root,
    (absolute) => absolute === kitFolder,
    (name) => PAGE_FILE_PATTERN.test(name)
  );

  return found.toSorted().slice(0, MAX_PAGES);
};

const listFileElements = async (
  ts: Ts,
  absolute: string
): Promise<readonly RawElement[]> => {
  const info = await getStat(absolute);

  if (info === null || !info.isFile() || info.size > MAX_BYTES) {
    return [];
  }

  const stamp = `${info.mtimeMs}:${info.size}`;
  const known = cache.get(absolute);

  if (known?.stamp === stamp) {
    return known.elements;
  }

  const code = await readFile(absolute, "utf-8");
  let elements: readonly RawElement[] = [];

  if (TAG_PATTERN.test(code)) {
    elements = listRawElements(ts, absolute, code);
  }

  if (cache.size >= MAX_CACHE) {
    cache.clear();
  }

  cache.set(absolute, { elements, stamp });

  return elements;
};

export { listFileElements, listPageFiles, listSourceFiles };
