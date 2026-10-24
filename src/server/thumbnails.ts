import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import type { StudioEvent, StudioEventInput, VersionKind } from '../shared/contracts.js';
import type { EventBus, PreviewService } from './types.js';
import type { StudioProjectStore } from './store/projects.js';
import { NotFoundError, assertSafeId } from './store/errors.js';

export const THUMB_VIEWPORT = { width: 1280, height: 800 };
const THUMB_KINDS = new Set<VersionKind>(['init', 'run', 'undo', 'restore', 'keep']);
const SETTLE_MS = 150;

export interface ThumbnailService {
  schedule(projectId: string): void;
  file(projectId: string, versionId: string): Promise<Buffer>;
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

export function createThumbnailService(deps: { projects: StudioProjectStore; preview: PreviewService }): ThumbnailService {
  const { projects, preview } = deps;
  const pending = new Set<string>();
  let worker: Promise<void> | null = null;

  const thumbsDir = (projectId: string): string => path.join(projects.projectDir(projectId), 'thumbs');

  const capture = async (projectId: string): Promise<void> => {
    if (!existsSync(path.join(projects.projectDir(projectId), 'project.json'))) return;
    const project = await projects.get(projectId);
    const main = projects.mainDirection(project);
    const versionId = main.headVersionId;
    if (!versionId || project.thumbnail?.versionId === versionId) return;
    const url = await preview.directionUrl(project, main);
    const dir = thumbsDir(projectId);
    const shot = await preview.screenshotTiles(url, { viewport: THUMB_VIEWPORT, tileHeight: THUMB_VIEWPORT.height, maxTiles: 1, from: 0, outPrefix: path.join(dir, `.raw-${versionId}`) });
    const raw = shot.paths[0];
    if (!raw) return;
    if (!existsSync(path.join(projects.projectDir(projectId), 'project.json'))) return;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${assertSafeId(versionId, 'versionId')}.png`), halfSize(await readFile(raw)));
    await rm(raw, { force: true });
    await projects.setThumbnail(projectId, { versionId, at: Date.now() });
    for (const name of await readdir(dir)) if (name !== `${versionId}.png`) await rm(path.join(dir, name), { force: true });
  };

  const drain = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    while (pending.size > 0) {
      const [next] = pending;
      if (next === undefined) break;
      pending.delete(next);
      await capture(next).catch((error: unknown) => console.error(`[thumbnails] capture failed for ${next}`, error));
    }
  };

  const kick = (): void => {
    if (worker) return;
    worker = drain().finally(() => {
      worker = null;
      if (pending.size > 0) kick();
    });
  };

  return {
    schedule(projectId) {
      pending.add(projectId);
      kick();
    },
    async file(projectId, versionId) {
      const file = path.join(thumbsDir(assertSafeId(projectId, 'projectId')), `${assertSafeId(versionId, 'versionId')}.png`);
      try {
        return await readFile(file);
      } catch {
        throw new NotFoundError('thumbnail not found');
      }
    },
    async idle() {
      while (worker) await worker;
    },
  };
}
