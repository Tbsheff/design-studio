import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import type { Project, StudioEvent, StudioEventInput, VersionKind } from '../shared/contracts.js';
import type { EventBus, PreviewService, VersionStore } from './types.js';
import type { StudioProjectStore } from './store/projects.js';
import { NotFoundError, assertSafeId } from './store/errors.js';
import { diffMask } from './preview/visual-diff.js';

export const THUMB_VIEWPORT = { width: 1280, height: 800 };
export const THUMB_KEEP = 200;
const THUMB_KINDS = new Set<VersionKind>(['init', 'run', 'undo', 'restore', 'keep']);
const SETTLE_MS = 150;
const DIFF_LIMITS = { minWidth: 320, maxWidth: 2560, minHeight: 320, maxHeight: 1600 };

export interface DiffResult {
  png: Buffer;
  changedPct: number;
}

export interface ThumbnailService {
  schedule(projectId: string): void;
  file(projectId: string, versionId: string): Promise<Buffer>;
  version(projectId: string, versionId: string, signal?: AbortSignal): Promise<Buffer>;
  diff(projectId: string, beforeId: string, afterId: string, viewport: { width: number; height: number }, signal?: AbortSignal): Promise<DiffResult>;
  idle(): Promise<void>;
}

export function halfSize(source: Buffer): Buffer {
  const png = PNG.sync.read(source);
  const width = Math.max(1, Math.floor(png.width / 2));
  const height = Math.max(1, Math.floor(png.height / 2));
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let sum = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          const sx = Math.min(png.width - 1, x * 2 + dx);
          const sy = Math.min(png.height - 1, y * 2 + dy);
          sum += png.data[(sy * png.width + sx) * 4 + channel] ?? 0;
        }
        out.data[(y * width + x) * 4 + channel] = Math.round(sum / 4);
      }
    }
  }
  return PNG.sync.write(out);
}

export function observeBus(bus: EventBus): { bus: EventBus; observe: (listener: (event: StudioEvent) => void) => void } {
  const listeners = new Set<(event: StudioEvent) => void>();
  return {
    observe: (listener) => listeners.add(listener),
    bus: {
      ...bus,
      emit(input: StudioEventInput): StudioEvent {
        const event = bus.emit(input);
        for (const listener of listeners) {
          try {
            listener(event);
          } catch (error) {
            console.error('[thumbnails] listener failed', error);
          }
        }
        return event;
      },
    },
  };
}

export function wantsThumbnail(event: StudioEvent): boolean {
  return event.type === 'version.created' && event.directionId === 'main' && THUMB_KINDS.has(event.version.meta.kind);
}

export function clampViewport(width: number, height: number): { width: number; height: number } {
  const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value))) : min);
  return { width: clamp(width, DIFF_LIMITS.minWidth, DIFF_LIMITS.maxWidth), height: clamp(height, DIFF_LIMITS.minHeight, DIFF_LIMITS.maxHeight) };
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

interface Job {
  notBefore: number;
  task: () => Promise<unknown>;
  promise: Promise<unknown>;
  settle: { resolve: (value: unknown) => void; reject: (error: unknown) => void };
  signals: AbortSignal[] | null;
}

function createShotQueue() {
  const jobs = new Map<string, Job>();
  let worker: Promise<void> | null = null;

  const wanted = (job: Job): boolean => job.signals === null || job.signals.some((signal) => !signal.aborted);

  const drain = async (): Promise<void> => {
    for (;;) {
      const [entry] = jobs;
      if (!entry) return;
      const [key, job] = entry;
      const wait = job.notBefore - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      jobs.delete(key);
      if (!wanted(job)) {
        job.settle.reject(abortError());
        continue;
      }
      await job.task().then(job.settle.resolve, job.settle.reject);
    }
  };

  const kick = (): void => {
    if (worker) return;
    worker = drain().finally(() => {
      worker = null;
      if (jobs.size > 0) kick();
    });
  };

  return {
    run<T>(key: string, task: () => Promise<T>, options: { signal?: AbortSignal; delayMs?: number } = {}): Promise<T> {
      const signal = options.signal;
      if (signal?.aborted) return Promise.reject(abortError());
      const existing = jobs.get(key);
      if (existing) {
        if (signal && existing.signals) existing.signals.push(signal);
        else if (!signal) existing.signals = null;
        return existing.promise as Promise<T>;
      }
      let settle!: Job['settle'];
      const promise = new Promise<unknown>((resolve, reject) => {
        settle = { resolve, reject };
      });
      jobs.set(key, { notBefore: Date.now() + (options.delayMs ?? 0), task, promise, settle, signals: signal ? [signal] : null });
      kick();
      return promise as Promise<T>;
    },
    async idle(): Promise<void> {
      while (worker) await worker;
    },
  };
}

async function prune(dir: string, keep: string | null): Promise<void> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const files: { name: string; at: number }[] = [];
  for (const name of names) {
    const file = path.join(dir, name);
    if (name.startsWith('.raw-')) {
      await rm(file, { force: true });
      continue;
    }
    if (!name.endsWith('.png') || name === keep) continue;
    const info = await stat(file).catch(() => null);
    if (info?.isFile()) files.push({ name, at: info.mtimeMs });
  }
  files.sort((a, b) => b.at - a.at);
  for (const old of files.slice(keep ? THUMB_KEEP - 1 : THUMB_KEEP)) await rm(path.join(dir, old.name), { force: true });
}

export function createThumbnailService(deps: { projects: StudioProjectStore; preview: PreviewService; versions: VersionStore }): ThumbnailService {
  const { projects, preview, versions } = deps;
  const queue = createShotQueue();

  const thumbsDir = (projectId: string): string => path.join(projects.projectDir(assertSafeId(projectId, 'projectId')), 'thumbs');
  const alive = (projectId: string): boolean => existsSync(path.join(projects.projectDir(projectId), 'project.json'));
  const headThumb = async (projectId: string): Promise<string | null> => {
    const versionId = (await projects.get(projectId).catch(() => null))?.thumbnail?.versionId;
    return versionId ? `${versionId}.png` : null;
  };

  const shootFirstViewport = async (url: string, viewport: { width: number; height: number }, prefix: string): Promise<Buffer | null> => {
    const shot = await preview.screenshotTiles(url, { viewport, tileHeight: viewport.height, maxTiles: 1, from: 0, outPrefix: prefix, still: true });
    const raw = shot.paths[0];
    if (!raw) return null;
    try {
      return await readFile(raw);
    } finally {
      await rm(raw, { force: true });
    }
  };

  const shootVersion = async (project: Project, versionId: string, viewport: { width: number; height: number }): Promise<Buffer | null> => {
    const snapshotDir = await versions.snapshot(project, versionId);
    if (project.kind === 'html' && !existsSync(path.join(snapshotDir, project.entry || 'index.html'))) throw new NotFoundError('this version has no page to show');
    const target = preview.snapshotShot ? await preview.snapshotShot(project, versionId, snapshotDir) : { url: await preview.snapshotUrl(project, versionId, snapshotDir), release: async () => undefined };
    try {
      return await shootFirstViewport(target.url, viewport, path.join(thumbsDir(project.id), `.raw-${versionId}-${viewport.width}x${viewport.height}`));
    } finally {
      await target.release().catch(() => undefined);
    }
  };

  const store = async (projectId: string, name: string, bytes: Buffer): Promise<void> => {
    if (!alive(projectId)) throw new NotFoundError('project not found');
    const dir = thumbsDir(projectId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    await prune(dir, await headThumb(projectId));
  };

  const captureHead = async (projectId: string): Promise<void> => {
    if (!alive(projectId)) return;
    const project = await projects.get(projectId);
    const main = projects.mainDirection(project);
    const versionId = main.headVersionId;
    if (!versionId || project.thumbnail?.versionId === versionId) return;
    const url = await preview.directionUrl(project, main);
    const raw = await shootFirstViewport(url, THUMB_VIEWPORT, path.join(thumbsDir(projectId), `.raw-${versionId}`));
    if (!raw || !alive(projectId)) return;
    await mkdir(thumbsDir(projectId), { recursive: true });
    await writeFile(path.join(thumbsDir(projectId), `${assertSafeId(versionId, 'versionId')}.png`), halfSize(raw));
    await projects.setThumbnail(projectId, { versionId, at: Date.now() });
    await prune(thumbsDir(projectId), `${versionId}.png`);
  };

  const readCached = (file: string): Promise<Buffer | null> => readFile(file).catch(() => null);

  return {
    schedule(projectId) {
      void queue.run(`head:${projectId}`, () => captureHead(projectId), { delayMs: SETTLE_MS }).catch((error: unknown) => console.error(`[thumbnails] capture failed for ${projectId}`, error));
    },
    async file(projectId, versionId) {
      const bytes = await readCached(path.join(thumbsDir(projectId), `${assertSafeId(versionId, 'versionId')}.png`));
      if (!bytes) throw new NotFoundError('thumbnail not found');
      return bytes;
    },
    async version(projectId, versionId, signal) {
      const name = `v-${assertSafeId(versionId, 'versionId')}.png`;
      const file = path.join(thumbsDir(projectId), name);
      const cached = await readCached(file);
      if (cached) return cached;
      const project = await projects.get(projectId);
      await versions.get(project, versionId);
      return queue.run(`version:${projectId}:${versionId}`, async () => {
        const again = await readCached(file);
        if (again) return again;
        const raw = await shootVersion(project, versionId, THUMB_VIEWPORT);
        if (!raw) throw new NotFoundError('thumbnail not found');
        const bytes = halfSize(raw);
        await store(projectId, name, bytes);
        return bytes;
      }, signal ? { signal } : {});
    },
    async diff(projectId, beforeId, afterId, requested, signal) {
      const viewport = clampViewport(requested.width, requested.height);
      const name = `diff-${assertSafeId(beforeId, 'versionId')}-${assertSafeId(afterId, 'versionId')}-${viewport.width}x${viewport.height}.png`;
      const file = path.join(thumbsDir(projectId), name);
      const toResult = (png: Buffer): DiffResult => {
        const mask = PNG.sync.read(png);
        let changed = 0;
        for (let i = 3; i < mask.data.length; i += 4) if ((mask.data[i] ?? 0) > 0) changed += 1;
        return { png, changedPct: Math.round((changed / Math.max(1, mask.width * mask.height)) * 1000) / 10 };
      };
      const cached = await readCached(file);
      if (cached) return toResult(cached);
      const project = await projects.get(projectId);
      await Promise.all([versions.get(project, beforeId), versions.get(project, afterId)]);
      return queue.run(`diff:${projectId}:${name}`, async () => {
        const again = await readCached(file);
        if (again) return toResult(again);
        const [before, after] = [await shootVersion(project, beforeId, viewport), await shootVersion(project, afterId, viewport)];
        if (!before || !after) throw new NotFoundError('could not render both versions');
        const mask = diffMask(PNG.sync.read(before), PNG.sync.read(after));
        await store(projectId, name, mask.png);
        return { png: mask.png, changedPct: Math.round((mask.changed / Math.max(1, mask.width * mask.height)) * 1000) / 10 };
      }, signal ? { signal } : {});
    },
    idle: () => queue.idle(),
  };
}
