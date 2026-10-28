import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';

const SKIPPED_SEGMENTS = new Set(['node_modules', '.git', '.next', '.turbo', '.vite', 'dist', '.DS_Store']);
const RECURSIVE_WATCH = process.platform === 'darwin' || process.platform === 'win32';

interface Tracked {
  root: string;
  watcher: FSWatcher;
  paths: Set<string>;
  synced: boolean;
  overflow: boolean;
}

export interface ChangeTracker {
  beginFullScan(key: string, root: string): void;
  endFullScan(key: string): void;
  changedSinceScan(key: string, root: string): string[] | null;
  note(key: string, paths: string[]): void;
  forget(key: string): void;
  close(): void;
}

function relevant(relative: string): boolean {
  return relative !== '' && !relative.split('/').some((segment) => SKIPPED_SEGMENTS.has(segment));
}

export function createChangeTracker(maxPaths: number): ChangeTracker {
  const tracked = new Map<string, Tracked>();

  const forget = (key: string): void => {
    const entry = tracked.get(key);
    if (!entry) return;
    tracked.delete(key);
    entry.watcher.close();
  };

  const add = (entry: Tracked, relative: string): void => {
    if (!relevant(relative)) return;
    entry.paths.add(relative);
    if (entry.paths.size > maxPaths) entry.overflow = true;
  };

  const start = (key: string, root: string): Tracked | null => {
    const existing = tracked.get(key);
    if (existing && existing.root === root) return existing;
    forget(key);
    if (!RECURSIVE_WATCH) return null;
    try {
      const watcher = watch(root, { recursive: true, persistent: false });
      const entry: Tracked = { root, watcher, paths: new Set(), synced: false, overflow: false };
      watcher.on('change', (_event, filename) => {
        if (typeof filename !== 'string') {
          entry.overflow = true;
          return;
        }
        add(entry, filename.split(path.sep).join('/'));
      });
      watcher.on('error', () => {
        if (tracked.get(key) === entry) forget(key);
      });
      tracked.set(key, entry);
      return entry;
    } catch {
      return null;
    }
  };

  return {
    beginFullScan(key, root) {
      const entry = start(key, root);
      if (!entry) return;
      entry.paths.clear();
      entry.overflow = false;
      entry.synced = false;
    },

    endFullScan(key) {
      const entry = tracked.get(key);
      if (entry) entry.synced = true;
    },

    changedSinceScan(key, root) {
      const entry = tracked.get(key);
      if (!entry || entry.root !== root || !entry.synced || entry.overflow) return null;
      const paths = [...entry.paths];
      entry.paths.clear();
      return paths;
    },

    note(key, paths) {
      const entry = tracked.get(key);
      if (entry) for (const relative of paths) add(entry, relative);
    },

    forget,

    close() {
      for (const key of [...tracked.keys()]) forget(key);
    },
  };
}
