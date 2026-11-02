import path from "node:path";

import { Context, Effect, Layer } from "effect";

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

const treeStamp = (root: string): number => treeStamps.get(root) ?? 0;

const noteTreeChange = (root: string, paths: string[]): void => {
  const stamp = (treeStamps.get(root) ?? 0) + 1;

  treeStamps.set(root, stamp);

  const log = [...(treeLogs.get(root) ?? []), { paths, stamp }];

  treeLogs.set(root, log.slice(-TREE_LOG_MAX));
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

interface ChangeFeedApi {
  readonly emit: (change: SourceChange) => Effect.Effect<void>;
  readonly noteWrite: (
    workTree: string,
    relatives: readonly string[],
    complete: boolean
  ) => Effect.Effect<void>;
  readonly since: (root: string, stamp: number) => readonly string[] | null;
  readonly stamp: (root: string) => number;
  readonly subscribe: (listener: Listener) => Effect.Effect<() => void>;
}

class ChangeFeed extends Context.Service<ChangeFeed, ChangeFeedApi>()(
  "design-studio/events/ChangeFeed"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ChangeFeed,
    ChangeFeed.of({
      emit: Effect.fn("ChangeFeed.emit")(function* run(change: SourceChange) {
        yield* Effect.sync(() => emitSourceChange(change));
      }),
      noteWrite: Effect.fn("ChangeFeed.noteWrite")(function* run(
        workTree: string,
        relatives: readonly string[],
        complete: boolean
      ) {
        yield* Effect.sync(() =>
          noteTreeWrite(workTree, [...relatives], complete)
        );
      }),
      since: treeChangesSince,
      stamp: treeStamp,
      subscribe: Effect.fn("ChangeFeed.subscribe")(function* run(
        listener: Listener
      ) {
        return yield* Effect.sync(() => onSourceChange(listener));
      }),
    })
  );
}

export {
  ChangeFeed,
  emitSourceChange,
  noteTreeChange,
  noteTreeWrite,
  onSourceChange,
  treeChangesSince,
  treeStamp,
};

export type { ChangeFeedApi, SourceChange, SourceFileChange };
