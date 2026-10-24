import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Direction, Project, StudioEvent, StudioEventInput } from '../../shared/contracts.js';
import type { EventBus, ProjectStore, VersionStore } from '../types.js';
import { WatcherManager } from './watcher.js';

function fakeBus(events: StudioEventInput[]): EventBus {
  return {
    emit: (event: StudioEventInput) => {
      events.push(event);
      return { ...event, seq: events.length, ts: Date.now() } as StudioEvent;
    },
  } as unknown as EventBus;
}

const projects = { get: async () => { throw new Error('no status'); } } as unknown as ProjectStore;
const versions = {} as VersionStore;
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function waitFor(check: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return check();
}

describe('WatcherManager', () => {
  it('reports a file written right after watch() starts, before the watcher is ready', async () => {
    const misses: number[] = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const root = await mkdtemp(path.join(os.tmpdir(), 'studio-watch-'));
      roots.push(root);
      const events: StudioEventInput[] = [];
      const manager = new WatcherManager({ bus: fakeBus(events), projects, versions });
      manager.watch({ id: 'p1' } as Project, { id: `d${attempt}`, workTree: root } as Direction);
      await writeFile(path.join(root, 'index.html'), '<h1>hi</h1>');
      const seen = await waitFor(() => events.some((event) => event.type === 'files.changed' && event.paths.includes('index.html')), 1500);
      if (!seen) misses.push(attempt);
      await manager.closeAll();
    }
    expect(misses).toEqual([]);
  });
});
