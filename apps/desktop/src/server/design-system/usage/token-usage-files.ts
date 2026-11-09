import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { BoundedCache } from "./deps.js";
import { toFileScan } from "./engine/index.js";
import type { FileScan, ScannedFile } from "./engine/index.js";

interface CachedScan {
  readonly scan: FileScan;
  readonly stamp: string;
}

type ScanCache = BoundedCache<string, CachedScan>;

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

const SOURCE_PATTERN = /\.(?:css|html|jsx|tsx|ts|js|mdx)$/u;
const SKIPPED_FILE_PATTERN = /\.(?:test|spec|stories|story|d)\.[jt]sx?$/u;
const MAX_FILES = 6000;
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

const toRelative = (root: string, absolute: string): string =>
  path.relative(root, absolute).split(path.sep).join("/");

const runFileScan = async (
  cache: ScanCache,
  root: string,
  absolute: string
): Promise<ScannedFile | null> => {
  try {
    const info = await stat(absolute);

    if (!info.isFile() || info.size > MAX_BYTES) {
      return null;
    }

    const file = toRelative(root, absolute);
    const stamp = `${info.mtimeMs}:${info.size}`;
    const known = cache.get(absolute);

    if (known?.stamp === stamp) {
      return { file, scan: known.scan };
    }

    const text = await readFile(absolute, "utf-8");
    const scan = toFileScan(text, absolute.endsWith(".css"));

    cache.set(absolute, { scan, stamp });

    return { file, scan };
  } catch {
    return null;
  }
};

const listScannedFiles = async (
  cache: ScanCache,
  root: string
): Promise<ScannedFile[]> => {
  const found = await listFolder(root);
  const targets = found.toSorted().slice(0, MAX_FILES);

  const scanned = await Promise.all(
    targets.map((absolute) => runFileScan(cache, root, absolute))
  );

  return scanned.filter((entry): entry is ScannedFile => entry !== null);
};

export { listScannedFiles };

export type { CachedScan, ScanCache };
