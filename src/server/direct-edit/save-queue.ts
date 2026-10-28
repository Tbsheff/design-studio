import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import type { Direction, Project, Version, VersionMeta } from '../../shared/contracts.js';
import type { VersionStore } from '../types.js';

export interface SaveDeps {
  versions: VersionStore;
  publish(project: Project, direction: Direction, version: Version, status: boolean): Promise<void>;
}

interface Lane {
  tail: Promise<void>;
  waiting: number;
  lastSaved: string | null;
}

export const PENDING_VERSION = 'pending-';
const lanes = new Map<string, Lane>();
const saved = new Map<string, string>();
const failures = new Map<string, string[]>();
const inQueue = new AsyncLocalStorage<boolean>();
const SAVED_MAX = 2000;

export function isPendingVersion(version: Pick<Version, 'id'>): boolean {
  return version.id.startsWith(PENDING_VERSION);
}

export function savedVersionId(id: string): string {
  return saved.get(id) ?? id;
}

export function takeSaveFailures(projectId: string): string[] {
  const list = failures.get(projectId) ?? [];
  failures.delete(projectId);
  return list;
}

function remember(pendingId: string, realId: string): void {
  if (saved.size > SAVED_MAX) saved.clear();
  saved.set(pendingId, realId);
}

function laneOf(projectId: string): Lane {
  let lane = lanes.get(projectId);
  if (!lane) {
    lane = { tail: Promise.resolve(), waiting: 0, lastSaved: null };
    lanes.set(projectId, lane);
  }
  return lane;
}

export async function savesSettled(projectId?: string): Promise<void> {
  if (inQueue.getStore()) return;
  const tails = projectId === undefined ? [...lanes.values()].map((lane) => lane.tail) : [lanes.get(projectId)?.tail];
  await Promise.all(tails);
}

function failText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function saveLater(deps: SaveDeps, project: Project, direction: Direction, relatives: string[], title: string, meta: VersionMeta): Version {
  const pending: Version = { id: `${PENDING_VERSION}${randomBytes(8).toString('hex')}`, directionId: direction.id, parentId: direction.headVersionId, title, meta, createdAt: Date.now(), changedFiles: relatives };
  const lane = laneOf(project.id);
  lane.waiting += 1;
  lane.tail = lane.tail.then(() =>
    inQueue.run(true, async () => {
      try {
        const version = await deps.versions.commitFile(project, direction, relatives, title, meta);
        lane.waiting -= 1;
        const savedId = version?.id ?? lane.lastSaved ?? direction.headVersionId;
        if (savedId) remember(pending.id, savedId);
        if (version) {
          lane.lastSaved = version.id;
          await deps.publish(project, direction, version, lane.waiting === 0);
        }
      } catch (error) {
        lane.waiting = Math.max(0, lane.waiting - 1);
        console.error(`[save-queue] could not save "${title}" as a version`, error);
        failures.set(project.id, [...(failures.get(project.id) ?? []), `"${title}" is written to the file but was not saved as a version (${failText(error)}).`]);
      }
    }),
  );
  return pending;
}

function projectIdOf(args: unknown[]): string | undefined {
  const first = args[0] as { id?: unknown; directions?: unknown } | undefined;
  return first && typeof first.id === 'string' && Array.isArray(first.directions) ? first.id : undefined;
}

export function withSaveQueue(store: VersionStore): VersionStore {
  return new Proxy(store, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== 'function' || key === 'untrackedCount') return value;
      return async (...args: unknown[]) => {
        await savesSettled(projectIdOf(args));
        return (value as (...all: unknown[]) => unknown).apply(target, args.map((arg) => (typeof arg === 'string' ? savedVersionId(arg) : arg)));
      };
    },
  });
}
