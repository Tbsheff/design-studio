import { stat } from "node:fs/promises";

import { onSourceChange } from "../events/index.js";
import type { SourceChange } from "../events/index.js";
import { logError } from "../platform/logger/index.js";
import type { BrowserPool } from "./browser.js";
import { startPlannedPatchFeed, toPeekPatch } from "./peek-patch.js";
import type { PeekPatch } from "./peek-patch.js";
import { noteLayoutKeepingWrite, writesKeptLayout } from "./tag-layout.js";

type LoadedPool = () => Promise<BrowserPool> | null;

interface WatchedChange {
  readonly projectId: string;
  readonly directionId: string;
  readonly root: string;
  readonly paths: string[];
}

const STYLE_FILE = /\.(?:css|scss|sass|less)$/iu;
const WATCH_LAG_MS = 150;
const MTIME_TRUST_MS = 2000;
const MTIME_SLACK_MS = 1;

const isOnlyStyles = (paths: readonly string[]): boolean =>
  paths.length > 0 && paths.every((file) => STYLE_FILE.test(file));

const toModifiedAt = async (file: string): Promise<number | null> => {
  try {
    const info = await stat(file);

    return info.mtimeMs;
  } catch {
    return null;
  }
};

const toWrittenAt = async (
  files: readonly string[],
  fallback: number
): Promise<number> => {
  const now = Date.now();

  const times = await Promise.all(files.map((file) => toModifiedAt(file)));

  const isTrusted = times.every(
    (time): time is number =>
      time !== null && time >= now - MTIME_TRUST_MS && time <= now
  );

  if (isTrusted && times.length > 0) {
    return Math.max(...times);
  }

  return fallback;
};

const runWatchedChange = async (
  loaded: LoadedPool,
  change: WatchedChange,
  files: readonly string[]
): Promise<void> => {
  const seenAt = Date.now() - WATCH_LAG_MS;

  try {
    const [coldAt, isKept] = await Promise.all([
      toWrittenAt(files, seenAt),
      writesKeptLayout(change),
    ]);

    const pool = await loaded();

    pool?.sourcesChanged(seenAt, coldAt, !isOnlyStyles(change.paths), !isKept);
  } catch (error) {
    logError("[preview] peek pages not marked stale", error);
  }
};

const applyWatchedChange = (
  loaded: LoadedPool,
  change: WatchedChange,
  files: readonly string[]
): void => {
  void runWatchedChange(loaded, change, files);
};

const runSourceWrite = async (
  loaded: LoadedPool,
  patch: PeekPatch | null,
  isCode: boolean,
  isMoved: boolean
): Promise<void> => {
  try {
    const pool = await loaded();

    if (pool === null) {
      return;
    }

    const at = Date.now() + MTIME_SLACK_MS;

    if (patch !== null) {
      pool.peeks.patchCold(patch.isTarget, patch.expression, at);
    }

    pool.peeks.markDirty(at, at, isCode, isMoved);
  } catch (error) {
    logError("[preview] peek pages not patched", error);
  }
};

const startSourceWrites = (
  loaded: LoadedPool,
  previewPort: number
): (() => void) => {
  const stopPlanned = startPlannedPatchFeed();

  const stopSource = onSourceChange((change: SourceChange) => {
    const isKept = noteLayoutKeepingWrite(
      change.projectId,
      change.directionId,
      change.files
    );

    const patch = toPeekPatch(change, isKept, previewPort);
    const isCode = !isOnlyStyles(change.files.map((file) => file.relative));

    void runSourceWrite(loaded, patch, isCode, !isKept);
  });

  return () => {
    stopPlanned();
    stopSource();
  };
};

export { applyWatchedChange, startSourceWrites };
