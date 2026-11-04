import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".tsx"]);

const SKIPPED = new Set([
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

const MAX_FILES = 6000;

const MAX_BYTES = 524_288;

const getEntries = async (folder: string): Promise<Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

type ListFolder = (folder: string) => Promise<string[]>;

const listEntry = async (
  folder: string,
  entry: Dirent,
  recurse: ListFolder
): Promise<string[]> => {
  if (SKIPPED.has(entry.name)) {
    return [];
  }

  const full = path.join(folder, entry.name);

  if (entry.isDirectory()) {
    return await recurse(full);
  }

  if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
    return [full];
  }

  return [];
};

const listFolder = async (folder: string): Promise<string[]> => {
  const entries = await getEntries(folder);

  const lists = await Promise.all(
    entries.map((entry) => listEntry(folder, entry, listFolder))
  );

  return lists.flat();
};

const listSourceFiles = async (root: string): Promise<string[]> => {
  const files = await listFolder(root);

  return files.slice(0, MAX_FILES);
};

const getSourceText = async (file: string): Promise<string | null> => {
  try {
    const code = await readFile(file, "utf-8");

    if (code.length > MAX_BYTES) {
      return null;
    }

    return code;
  } catch {
    return null;
  }
};

export { getSourceText, listSourceFiles };
