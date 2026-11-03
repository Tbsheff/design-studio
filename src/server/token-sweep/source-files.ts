import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestError } from "./deps.js";

const SWEEP_EXTENSIONS = new Set([".css", ".html", ".jsx", ".tsx"]);

const SKIPPED = new Set([
  ".git",
  ".next",
  ".studio",
  "build",
  "dist",
  "node_modules",
  "out",
]);

const MAX_FILES = 600;

const isSafeRelative = (relative: string): boolean => {
  const parts = relative.split("/");

  return (
    relative !== "" &&
    !path.isAbsolute(relative) &&
    parts.every((part) => part !== ".." && !SKIPPED.has(part))
  );
};

const walk = async (root: string, folder: string): Promise<string[]> => {
  const entries = await readdir(path.join(root, folder), {
    withFileTypes: true,
  });

  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const relative = path.posix.join(folder, entry.name);

      if (SKIPPED.has(entry.name)) {
        return [];
      }

      if (entry.isDirectory()) {
        return await walk(root, relative);
      }

      if (SWEEP_EXTENSIONS.has(path.extname(entry.name))) {
        return [relative];
      }

      return [];
    })
  );

  return nested.flat();
};

const listSourceFiles = async (workTree: string): Promise<string[]> => {
  const found = await walk(workTree, ".");

  return found
    .map((relative) => relative.replace(/^\.\//u, ""))
    .toSorted()
    .slice(0, MAX_FILES);
};

const requireSafe = (relative: string): string => {
  if (!isSafeRelative(relative)) {
    throw new BadRequestError(
      "page must be a source file path in the project."
    );
  }

  return relative;
};

const readSource = (workTree: string, relative: string): Promise<string> =>
  readFile(path.join(workTree, relative), "utf-8");

export { listSourceFiles, readSource, requireSafe };
