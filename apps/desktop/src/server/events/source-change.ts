import path from "node:path";

import { logError } from "../platform/logger/index.js";

interface SourceFileChange {
  relative: string;
  before: string;
  after: string;
}

interface SourceChange {
  projectId: string;
  directionId: string;
  files: SourceFileChange[];
}

type Listener = (change: SourceChange) => void;

const listeners = new Set<Listener>();
const treeStamps = new Map<string, number>();
const treeLogs = new Map<string, { stamp: number; paths: string[] }[]>();
const TREE_LOG_MAX = 200;
const TREE_PATHS_MAX = 20_000;

const treeStamp = (root: string): number => treeStamps.get(root) ?? 0;

const noteTreeChange = (root: string, paths: string[]): void => {
  const stamp = (treeStamps.get(root) ?? 0) + 1;

  treeStamps.set(root, stamp);

  const log = [...(treeLogs.get(root) ?? []), { paths, stamp }].slice(
    -TREE_LOG_MAX
  );

  let total = log.reduce((sum, item) => sum + item.paths.length, 0);

  while (total > TREE_PATHS_MAX && log.length > 0) {
    total -= log.shift()?.paths.length ?? 0;
  }

  treeLogs.set(root, log);
};

const noteTreeWrite = (
  workTree: string,
  relatives: string[],
  complete: boolean
): void => {
  const root = path.resolve(workTree);

  if (complete) {
    noteTreeChange(
      root,
      relatives.map((relative) => path.join(root, ...relative.split("/")))
    );

    return;
  }

  treeStamps.set(root, treeStamp(root) + 1);
  treeLogs.delete(root);
};

const treeChangesSince = (root: string, stamp: number): string[] | null => {
  const log = treeLogs.get(root) ?? [];

  if (stamp < treeStamp(root) && (log[0]?.stamp ?? Infinity) > stamp + 1) {
    return null;
  }

  return log.flatMap((item) => {
    if (item.stamp > stamp) {
      return item.paths;
    }

    return [];
  });
};

const onSourceChange = (listener: Listener): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const emitSourceChange = (change: SourceChange): void => {
  if (change.files.length === 0) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(change);
    } catch (error) {
      logError("[source-change] listener failed", error);
    }
  }
};

export {
  emitSourceChange,
  noteTreeChange,
  noteTreeWrite,
  onSourceChange,
  treeChangesSince,
  treeStamp,
};

export type { Listener, SourceChange, SourceFileChange };
