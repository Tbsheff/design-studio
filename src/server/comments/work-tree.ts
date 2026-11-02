import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { treeStamp } from "../direct-edit/change-feed.js";

interface TreeEntry {
  readonly at: number;
  readonly list: Promise<string[]>;
  readonly stamp: number;
}

interface WalkState {
  count: number;
  readonly root: string;
}

const SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  "vite-cache",
  ".DS_Store",
  ".studio",
]);

const TREE_MAX = 3000;

const TREE_CACHE_MS = 30_000;

const TREE_CACHE_MAX = 50;

const trees = new Map<string, TreeEntry>();

const isKept = (item: Dirent): boolean =>
  !SKIP.has(item.name) && !item.name.startsWith(".");

const readItems = async (dir: string): Promise<Dirent[]> => {
  try {
    const items = await readdir(dir, { withFileTypes: true });

    return items
      .filter((item) => isKept(item))
      .toSorted((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
};

const toRelative = (state: WalkState, full: string): string =>
  path.relative(state.root, full).split(path.sep).join("/");

const walkDir = async (state: WalkState, dir: string): Promise<string[]> => {
  const items = await readItems(dir);

  const nested = await Promise.all(
    items.map(async (item): Promise<string[]> => {
      const full = path.join(dir, item.name);

      if (state.count >= TREE_MAX) {
        return [];
      }

      if (item.isDirectory()) {
        const files = await walkDir(state, full);

        return files;
      }

      if (!item.isFile()) {
        return [];
      }

      state.count += 1;

      return [toRelative(state, full)];
    })
  );

  return nested.flat();
};

const walkWorkTree = async (root: string): Promise<string[]> => {
  const files = await walkDir({ count: 0, root }, root);

  return files.slice(0, TREE_MAX);
};

const isFresh = (entry: TreeEntry | null, stamp: number): boolean =>
  entry !== null &&
  entry.stamp === stamp &&
  Date.now() - entry.at < TREE_CACHE_MS;

const trimCache = (): void => {
  if (trees.size <= TREE_CACHE_MAX) {
    return;
  }

  const oldest = trees.keys().next();

  if (oldest.done !== true) {
    trees.delete(oldest.value);
  }
};

const forgetOnFailure = async (
  root: string,
  list: Promise<string[]>
): Promise<void> => {
  try {
    await list;
  } catch {
    trees.delete(root);
  }
};

const listWorkTree = (root: string): Promise<string[]> => {
  const stamp = treeStamp(root);
  const known = trees.get(root) ?? null;

  if (known !== null && isFresh(known, stamp)) {
    return known.list;
  }

  const list = walkWorkTree(root);

  trees.set(root, { at: Date.now(), list, stamp });
  void forgetOnFailure(root, list);
  trimCache();

  return list;
};

export { listWorkTree, TREE_MAX };
