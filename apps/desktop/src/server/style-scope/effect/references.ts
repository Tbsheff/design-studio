import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { getTextOrNull } from "./sheet.js";

const SOURCE_EXTENSIONS = new Set([".html", ".htm", ".jsx", ".tsx"]);

const SKIPPED = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  ".studio",
  "build",
  ".next",
]);

const FILES_MAX = 2000;

const TOKEN_BREAK = /[^\w-]+/u;

const toEntries = async (folder: string): Promise<Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

const listSourceFiles = async (
  root: string,
  folder: string
): Promise<string[]> => {
  const entries = await toEntries(path.join(root, folder));

  const nested = await Promise.all(
    entries.map((entry): string[] | Promise<string[]> => {
      const relative = path.posix.join(folder, entry.name);

      if (entry.isDirectory() && !SKIPPED.has(entry.name)) {
        return listSourceFiles(root, relative);
      }

      if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return [relative];
      }

      return [];
    })
  );

  return nested.flat().slice(0, FILES_MAX);
};

const toFileText = async (
  workTree: string,
  relative: string,
  overrides: ReadonlyMap<string, string>
): Promise<string> => {
  if (overrides.has(relative)) {
    return overrides.get(relative) ?? "";
  }

  return (await getTextOrNull(path.join(workTree, relative))) ?? "";
};

const getReferenceCount = async (
  workTree: string,
  className: string,
  overrides: ReadonlyMap<string, string>
): Promise<number> => {
  const files = await listSourceFiles(workTree, "");

  const texts = await Promise.all(
    files.map((relative) => toFileText(workTree, relative, overrides))
  );

  return texts.reduce(
    (sum, text) =>
      sum + text.split(TOKEN_BREAK).filter((word) => word === className).length,
    0
  );
};

export { getReferenceCount };
