import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS: ReadonlySet<string> = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const DEPTH_MAX = 8;

const FILES_MAX = 160;

const BYTES_MAX = 400_000;

const PROPERTY = /(?<name>--[a-z0-9-]{1,64}):/giu;

const listEntries = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const listCssFiles = async (dir: string, depth: number): Promise<string[]> => {
  if (depth > DEPTH_MAX) {
    return [];
  }

  const entries = await listEntries(dir);

  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        return listCssFiles(full, depth + 1);
      }

      if (entry.isFile() && entry.name.endsWith(".css")) {
        return [full];
      }

      return [];
    })
  );

  return nested.flat();
};

const getCssText = async (file: string): Promise<string> => {
  try {
    const info = await stat(file);

    if (info.size > BYTES_MAX) {
      return "";
    }

    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const inspectDeclaredTokens = async (root: string): Promise<Set<string>> => {
  const all = await listCssFiles(root, 0);

  const texts = await Promise.all(
    all.slice(0, FILES_MAX).map((file) => getCssText(file))
  );

  const declared = new Set<string>();

  for (const text of texts) {
    for (const match of text.matchAll(PROPERTY)) {
      declared.add(match.groups?.["name"] ?? "");
    }
  }

  return declared;
};

export { inspectDeclaredTokens };
