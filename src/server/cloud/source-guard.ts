import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

interface SourceBindings {
  readonly appDir: string;
  readonly sourcePath: string | null;
}

type GuardResult =
  | { readonly code: string; readonly ok: false }
  | { readonly ok: true };

const SKIP_DIRS = new Set(["node_modules", ".git"]);

const toRealPath = async (target: string): Promise<string | null> => {
  try {
    return await realpath(target);
  } catch {
    return null;
  }
};

const isInside = (child: string, root: string): boolean =>
  child === root || child.startsWith(root + path.sep);

const hashFile = async (target: string): Promise<string | null> => {
  try {
    return createHash("sha256")
      .update(await readFile(target))
      .digest("hex");
  } catch {
    return null;
  }
};

const readEntries = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const collectHashes = async (dir: string): Promise<string[]> => {
  const entries = await readEntries(dir);

  const found = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          return [];
        }

        return await collectHashes(full);
      }

      if (!entry.isFile()) {
        return [];
      }

      const hash = await hashFile(full);

      if (hash === null) {
        return [];
      }

      return [hash];
    })
  );

  return found.flat();
};

const buildAppDirIndex = async (appDir: string): Promise<Set<string>> =>
  new Set(await collectHashes(appDir));

const insideBinding = async (
  resolved: string,
  root: string | null
): Promise<boolean> => {
  if (root === null) {
    return false;
  }

  const realRoot = await toRealPath(root);

  if (realRoot === null) {
    return false;
  }

  return isInside(resolved, realRoot);
};

const refuseUpload = async (
  bindings: SourceBindings,
  index: ReadonlySet<string>,
  realPath: string,
  sha256: string
): Promise<GuardResult> => {
  const resolved = await toRealPath(realPath);

  if (resolved === null) {
    return { code: "path_unresolved", ok: false };
  }

  if (await insideBinding(resolved, bindings.appDir)) {
    return { code: "inside_app_dir", ok: false };
  }

  if (await insideBinding(resolved, bindings.sourcePath)) {
    return { code: "inside_source_path", ok: false };
  }

  if (index.has(sha256)) {
    return { code: "matches_app_dir_hash", ok: false };
  }

  return { ok: true };
};

export { buildAppDirIndex, refuseUpload };

export type { GuardResult, SourceBindings };
