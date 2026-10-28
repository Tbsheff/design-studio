import { randomBytes } from 'node:crypto';
import { watch, type FSWatcher } from 'node:fs';
import { lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SKIPPED_SEGMENTS = new Set(['node_modules', '.git', '.next', '.turbo', '.vite', 'dist', '.DS_Store']);
const RECURSIVE_WATCH = process.platform === 'darwin' || process.platform === 'win32';
const COOKIE_DIR = 'node_modules/.cache/design-studio';
const FLUSH_TIMEOUT_MS = 1000;

interface Tracked {
  root: string;
  watcher: FSWatcher;
  paths: Set<string>;
  synced: boolean;
  overflow: boolean;
  generation: number;
  cookies: Map<string, () => void>;
}

export interface ChangeTracker {
  beginFullScan(key: string, root: string): number | null;
  endFullScan(key: string, generation: number | null): boolean;
  changedSinceScan(key: string, root: string): Promise<string[] | null>;
  note(key: string, paths: string[]): void;
  forget(key: string): void;
  close(): void;
}

function relevant(relative: string): boolean {
  return relative !== '' && !relative.split('/').some((segment) => SKIPPED_SEGMENTS.has(segment));
}

async function cookieDirOf(root: string): Promise<string | null> {
  const modules = path.join(root, 'node_modules');
  const info = await lstat(modules).catch(() => null);
  if (!info?.isDirectory()) return null;
  const [realRoot, realModules] = await Promise.all([realpath(root), realpath(modules)]);
  return realModules === path.join(realRoot, 'node_modules') ? path.join(root, ...COOKIE_DIR.split('/')) : null;
}

async function flush(entry: Tracked): Promise<boolean> {
  const dir = await cookieDirOf(entry.root);
  if (!dir) return false;
  const name = `sync-${randomBytes(6).toString('hex')}`;
  const file = path.join(dir, name);
  let timer: NodeJS.Timeout | undefined;
  const seen = new Promise<boolean>((resolve) => {
    entry.cookies.set(`${COOKIE_DIR}/${name}`, () => resolve(true));
    timer = setTimeout(() => resolve(false), FLUSH_TIMEOUT_MS);
  });
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(file, '');
    return await seen;
  } finally {
    clearTimeout(timer);
    entry.cookies.delete(`${COOKIE_DIR}/${name}`);
    await rm(file, { force: true });
  }
}

export function createChangeTracker(maxPaths: number): ChangeTracker {
  const tracked = new Map<string, Tracked>();
  let scans = 0;

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

  const onEvent = (entry: Tracked, filename: string | Buffer | null): void => {
    if (typeof filename !== 'string') {
      entry.overflow = true;
      return;
    }
    const relative = filename.split(path.sep).join('/');
    entry.cookies.get(relative)?.();
    add(entry, relative);
  };

  const start = (key: string, root: string): Tracked | null => {
    const existing = tracked.get(key);
    if (existing && existing.root === root) return existing;
    forget(key);
    if (!RECURSIVE_WATCH) return null;
    try {
      const watcher = watch(root, { recursive: true, persistent: false });
      const entry: Tracked = { root, watcher, paths: new Set(), synced: false, overflow: false, generation: 0, cookies: new Map() };
      watcher.on('change', (_event, filename) => onEvent(entry, filename));
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
      if (!entry) return null;
      entry.paths.clear();
      entry.overflow = false;
      entry.synced = false;
      scans += 1;
      entry.generation = scans;
      return scans;
    },

    endFullScan(key, generation) {
      const entry = tracked.get(key);
      if (!entry || generation === null || entry.generation !== generation) return false;
      entry.synced = true;
      return true;
    },

    async changedSinceScan(key, root) {
      const entry = tracked.get(key);
      if (!entry || entry.root !== root || !entry.synced || entry.overflow) return null;
      if (!(await flush(entry).catch(() => false)) || entry.overflow || tracked.get(key) !== entry) return null;
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
