import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project } from '../../shared/contracts.js';
import type { EventBus, ProjectStore, VersionStore } from '../types.js';

const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'dist', '.vite', 'vite-cache', '.DS_Store']);
const COALESCE_MS = 20;
const STATUS_INTERVAL_MS = 500;

interface WatcherDeps {
  bus: EventBus;
  projects: ProjectStore;
  versions: VersionStore;
  onChanged?: (change: { projectId: string; directionId: string; root: string; paths: string[] }) => void;
}

interface DirectionWatch {
  projectId: string;
  directionId: string;
  root: string;
  watcher: FSWatcher;
  readyPromise: Promise<void>;
  pending: Set<string>;
  statusPaths: Set<string>;
  flushTimer: NodeJS.Timeout | null;
  statusTimer: NodeJS.Timeout | null;
  lastStatusAt: number;
  statusRunning: boolean;
  statusQueued: boolean;
  closed: boolean;
}

function isIgnored(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  if (relative === '' || relative.startsWith('..')) return false;
  return relative.split(path.sep).some((segment) => IGNORED_SEGMENTS.has(segment));
}

export class WatcherManager {
  private readonly watches = new Map<string, DirectionWatch>();

  constructor(private readonly deps: WatcherDeps) {}

  has(directionId: string): boolean {
    return this.watches.has(directionId);
  }

  watch(project: Project, direction: Direction): void {
    const existing = this.watches.get(direction.id);
    if (existing && existing.root === path.resolve(direction.workTree)) return;
    if (existing) this.unwatch(direction.id);
    const root = path.resolve(direction.workTree);
    const watcher = watch(root, {
      ignored: (target: string) => isIgnored(root, target),
      ignoreInitial: true,
      awaitWriteFinish: false,
      persistent: true,
    });
    const entry: DirectionWatch = {
      projectId: project.id,
      directionId: direction.id,
      root,
      watcher,
      readyPromise: new Promise<void>((resolve) => watcher.once('ready', () => resolve())),
      pending: new Set(),
      statusPaths: new Set(),
      flushTimer: null,
      statusTimer: null,
      lastStatusAt: 0,
      statusRunning: false,
      statusQueued: false,
      closed: false,
    };
    const watchedAt = Date.now();
    watcher.once('ready', () => void this.recordEarlyWrites(entry, watchedAt));
    const onPath = (target: string): void => this.record(entry, target);
    watcher.on('add', onPath);
    watcher.on('change', onPath);
    watcher.on('unlink', onPath);
    watcher.on('addDir', onPath);
    watcher.on('unlinkDir', onPath);
    watcher.on('error', () => undefined);
    this.watches.set(direction.id, entry);
  }

  ready(directionId: string): Promise<void> {
    return this.watches.get(directionId)?.readyPromise ?? Promise.resolve();
  }

  unwatchOf(projectId: string, directionId: string): void {
    if (this.watches.get(directionId)?.projectId === projectId) this.unwatch(directionId);
  }

  unwatch(directionId: string): void {
    const entry = this.watches.get(directionId);
    if (!entry) return;
    this.watches.delete(directionId);
    entry.closed = true;
    if (entry.flushTimer) clearTimeout(entry.flushTimer);
    if (entry.statusTimer) clearTimeout(entry.statusTimer);
    void entry.watcher.close();
  }

  async closeAll(): Promise<void> {
    const entries = [...this.watches.values()];
    this.watches.clear();
    await Promise.all(
      entries.map(async (entry) => {
        entry.closed = true;
        if (entry.flushTimer) clearTimeout(entry.flushTimer);
        if (entry.statusTimer) clearTimeout(entry.statusTimer);
        await entry.watcher.close();
      }),
    );
  }

  private async recordEarlyWrites(entry: DirectionWatch, since: number): Promise<void> {
    const walk = async (dir: string): Promise<void> => {
      const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const item of items) {
        const target = path.join(dir, item.name);
        if (entry.closed || isIgnored(entry.root, target)) continue;
        if (item.isDirectory()) await walk(target);
        else if (item.isFile() && ((await stat(target).catch(() => null))?.mtimeMs ?? 0) >= since) this.record(entry, target);
      }
    };
    await walk(entry.root);
  }

  private record(entry: DirectionWatch, target: string): void {
    if (entry.closed) return;
    const relative = path.relative(entry.root, target).split(path.sep).join('/');
    if (!relative || relative.startsWith('..')) return;
    entry.pending.add(relative);
    if (!entry.flushTimer) entry.flushTimer = setTimeout(() => this.flush(entry), COALESCE_MS);
  }

  private flush(entry: DirectionWatch): void {
    entry.flushTimer = null;
    if (entry.closed || entry.pending.size === 0) return;
    const paths = [...entry.pending].sort();
    entry.pending.clear();
    this.deps.bus.emit({
      type: 'files.changed',
      projectId: entry.projectId,
      directionId: entry.directionId,
      paths,
      changedAt: Date.now(),
    });
    this.deps.onChanged?.({ projectId: entry.projectId, directionId: entry.directionId, root: entry.root, paths });
    for (const changed of paths) entry.statusPaths.add(changed);
    this.scheduleStatus(entry);
  }

  private scheduleStatus(entry: DirectionWatch): void {
    if (entry.statusTimer) return;
    if (entry.statusRunning) {
      entry.statusQueued = true;
      return;
    }
    const wait = Math.max(0, entry.lastStatusAt + STATUS_INTERVAL_MS - Date.now());
    entry.statusTimer = setTimeout(() => {
      entry.statusTimer = null;
      void this.emitStatus(entry);
    }, wait);
  }

  private async emitStatus(entry: DirectionWatch): Promise<void> {
    if (entry.closed) return;
    entry.statusRunning = true;
    entry.lastStatusAt = Date.now();
    const paths = [...entry.statusPaths];
    entry.statusPaths.clear();
    try {
      const project = await this.deps.projects.get(entry.projectId);
      const direction = project.directions.find((item) => item.id === entry.directionId);
      if (direction && !entry.closed) {
        const status = await this.deps.versions.status(project, direction, paths);
        if (!entry.closed) {
          this.deps.bus.emit({ type: 'status.changed', projectId: entry.projectId, directionId: entry.directionId, status });
        }
      }
    } catch {
      entry.lastStatusAt = Date.now();
      for (const changed of paths) entry.statusPaths.add(changed);
    } finally {
      entry.statusRunning = false;
      if (entry.statusQueued && !entry.closed) {
        entry.statusQueued = false;
        this.scheduleStatus(entry);
      }
    }
  }
}
