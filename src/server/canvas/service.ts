import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CANVAS_FILE, emptyCanvasFile, parseCanvasText, serializeCanvasFile, type CanvasFile } from '../../shared/canvas-file.js';
import type { CanvasPresence, CanvasWriteSource, Direction, Project } from '../../shared/contracts.js';
import { ConflictError } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import type { EventBus } from '../types.js';

export interface CanvasSnapshot {
  canvas: CanvasFile | null;
  hash: string | null;
}

export interface CanvasWrite {
  source: CanvasWriteSource;
  writer?: string;
  baseHash?: string | null;
}

export interface CanvasService {
  ownerOf(project: Project): Direction;
  read(project: Project): Promise<CanvasSnapshot>;
  write(project: Project, canvas: CanvasFile, write: CanvasWrite): Promise<CanvasSnapshot>;
  update(project: Project, change: (canvas: CanvasFile) => CanvasFile | null, write: CanvasWrite): Promise<CanvasSnapshot>;
  announce(project: Project): Promise<void>;
  setPresence(projectId: string, presence: CanvasPresence): void;
  presence(projectId: string): CanvasPresence | null;
  point(project: Project, frameId: string, selector?: string): void;
}

const MAIN_DIRECTION_ID = 'main';
const PRESENCE_TTL_MS = 10 * 60 * 1000;

export function canvasOwner(project: Project): Direction {
  const direction = project.directions.find((candidate) => candidate.id === MAIN_DIRECTION_ID) ?? project.directions[0];
  if (!direction) throw new Error(`project ${project.id} has no directions`);
  return direction;
}

export function canvasPath(workTree: string): string {
  return path.join(workTree, ...CANVAS_FILE.split('/'));
}

export type ProjectDirOf = (projectId: string) => string;

const APP_CANVAS_FILE = 'canvas.json';

export function canvasFileOf(project: Project, projectDir: ProjectDirOf | null): string {
  return project.app && projectDir ? path.join(projectDir(project.id), APP_CANVAS_FILE) : canvasPath(canvasOwner(project).workTree);
}

export async function readProjectCanvas(project: Project, projectDir: ProjectDirOf | null): Promise<{ canvas: CanvasFile | null; text: string | null }> {
  const text = await readFile(canvasFileOf(project, projectDir), 'utf8').catch(() => null);
  if (text === null) return project.app && projectDir ? readCanvasAt(canvasOwner(project).workTree) : { canvas: null, text: null };
  return { canvas: parseCanvasText(text), text };
}

function hashOf(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 16);
}

export async function readCanvasAt(workTree: string): Promise<{ canvas: CanvasFile | null; text: string | null }> {
  const text = await readFile(canvasPath(workTree), 'utf8').catch(() => null);
  if (text === null) return { canvas: null, text: null };
  return { canvas: parseCanvasText(text), text };
}

async function writeAtomic(target: string, text: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(temp, text);
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export function createCanvasService(bus: EventBus, projectDir: ProjectDirOf | null = null): CanvasService {
  const lock = createKeyedMutex();
  const presences = new Map<string, CanvasPresence>();

  const snapshotOf = async (project: Project): Promise<CanvasSnapshot> => {
    const { canvas, text } = await readProjectCanvas(project, projectDir);
    if (canvas === null || text === null) return { canvas: null, hash: null };
    return { canvas, hash: hashOf(serializeCanvasFile(canvas)) };
  };

  const emit = (project: Project, snapshot: CanvasSnapshot, write: CanvasWrite): void => {
    bus.emit({
      type: 'canvas.changed',
      projectId: project.id,
      directionId: canvasOwner(project).id,
      canvas: snapshot.canvas,
      hash: snapshot.hash,
      source: write.source,
      ...(write.writer ? { writer: write.writer } : {}),
    });
  };

  const store = async (project: Project, canvas: CanvasFile, write: CanvasWrite): Promise<CanvasSnapshot> => {
    const text = serializeCanvasFile(canvas);
    const file = canvasFileOf(project, projectDir);
    const current = await readFile(file, 'utf8').catch(() => null);
    const saved = parseCanvasText(text) ?? emptyCanvasFile();
    const snapshot = { canvas: saved, hash: hashOf(text) };
    if (current === text) return snapshot;
    await writeAtomic(file, text);
    emit(project, snapshot, write);
    return snapshot;
  };

  const keyOf = (project: Project): string => `${project.id}/${canvasOwner(project).id}`;

  return {
    ownerOf: canvasOwner,

    read: snapshotOf,

    write(project, canvas, write) {
      return lock(keyOf(project), async () => {
        if (write.baseHash !== undefined) {
          const current = await snapshotOf(project);
          if (current.hash !== write.baseHash) throw new ConflictError('canvas_stale');
        }
        return store(project, canvas, write);
      });
    },

    update(project, change, write) {
      return lock(keyOf(project), async () => {
        const current = await snapshotOf(project);
        const next = change(current.canvas ?? emptyCanvasFile());
        if (next === null) return current;
        return store(project, next, write);
      });
    },

    async announce(project) {
      const snapshot = await lock(keyOf(project), () => snapshotOf(project));
      emit(project, snapshot, { source: 'restore' });
    },

    setPresence(projectId, presence) {
      presences.set(projectId, presence);
    },

    presence(projectId) {
      const found = presences.get(projectId);
      if (!found || Date.now() - found.at > PRESENCE_TTL_MS) return null;
      return found;
    },

    point(project, frameId, selector) {
      bus.emit({ type: 'canvas.point', projectId: project.id, directionId: canvasOwner(project).id, frameId, at: Date.now(), ...(selector ? { selector } : {}) });
    },
  };
}
