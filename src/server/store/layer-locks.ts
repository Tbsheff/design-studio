import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanLockKeys, type LayerLocksView } from '../../shared/layer-locks.js';
import { writeAtomic } from '../canvas/service.js';
import type { EventBus } from '../types.js';
import { assertSafeId } from './errors.js';
import { createKeyedMutex } from './mutex.js';

const FILE = 'layer-state.json';

interface LayerStateFile {
  locks: Record<string, string[]>;
}

export interface LayerLockStore {
  read(projectId: string, directionId: string): Promise<LayerLocksView>;
  write(projectId: string, directionId: string, keys: string[]): Promise<LayerLocksView>;
  update(projectId: string, directionId: string, change: (keys: string[]) => string[]): Promise<LayerLocksView>;
}

export interface LayerLockDeps {
  projectDir: (projectId: string) => string;
  bus: EventBus;
}

async function readState(file: string): Promise<LayerStateFile> {
  const text = await readFile(file, 'utf8').catch(() => null);
  if (text === null) return { locks: {} };
  try {
    const parsed = JSON.parse(text) as Partial<LayerStateFile> | null;
    const locks = parsed?.locks && typeof parsed.locks === 'object' ? parsed.locks : {};
    return { locks: Object.fromEntries(Object.entries(locks).map(([did, keys]) => [did, cleanLockKeys(keys)])) };
  } catch {
    return { locks: {} };
  }
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

export function createLayerLockStore(deps: LayerLockDeps): LayerLockStore {
  const lock = createKeyedMutex();
  const fileOf = (projectId: string) => path.join(deps.projectDir(projectId), FILE);

  const read = async (projectId: string, directionId: string): Promise<LayerLocksView> => {
    const did = assertSafeId(directionId, 'directionId');
    const state = await readState(fileOf(projectId));
    return { directionId: did, keys: state.locks[did] ?? [] };
  };

  const update = (projectId: string, directionId: string, change: (keys: string[]) => string[]) =>
    lock(projectId, async (): Promise<LayerLocksView> => {
      const did = assertSafeId(directionId, 'directionId');
      const file = fileOf(projectId);
      const state = await readState(file);
      const before = state.locks[did] ?? [];
      const keys = cleanLockKeys(change(before));
      if (same(before, keys)) return { directionId: did, keys };
      if (keys.length === 0) delete state.locks[did];
      else state.locks[did] = keys;
      await writeAtomic(file, `${JSON.stringify(state, null, 2)}\n`);
      deps.bus.emit({ type: 'layer-locks.changed', projectId, directionId: did, keys });
      return { directionId: did, keys };
    });

  return { read, update, write: (projectId, directionId, keys) => update(projectId, directionId, () => keys) };
}

let configured: LayerLockStore | null = null;

export function configureLayerLocks(store: LayerLockStore): void {
  configured = store;
}

export function configuredLayerLocks(): LayerLockStore | null {
  return configured;
}
