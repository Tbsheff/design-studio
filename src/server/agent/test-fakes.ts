import { mkdir, mkdtemp, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_SETTINGS,
  type Direction,
  type Project,
  type ProjectKind,
  type ProjectSettings,
  type StudioEvent,
  type StudioEventInput,
  type Version,
  type VersionMeta,
} from '../../shared/contracts.js';
import type { EventBus, PreviewService, ProjectStore, VersionStore } from '../types.js';

interface FakeBus extends EventBus {
  events: StudioEvent[];
}

export function createFakeBus(): FakeBus {
  const events: StudioEvent[] = [];
  const listeners = new Set<(event: StudioEvent) => void>();
  return {
    events,
    emit(input: StudioEventInput) {
      const event = { ...input, seq: events.length + 1, ts: Date.now() } as StudioEvent;
      events.push(event);
      for (const listener of listeners) listener(event);
      return event;
    },
    since(projectId, afterSeq) {
      return events.filter((event) => event.projectId === projectId && event.seq > afterSeq);
    },
    subscribe(_projectId, listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function notImplemented(name: string): never {
  throw new Error(`${name} is not part of the fake`);
}

interface FakeProjects extends ProjectStore {
  current: Project;
}

export function createFakeProjects(project: Project, dataDir: string): FakeProjects {
  const store: FakeProjects = {
    current: project,
    async list() {
      return [store.current];
    },
    async get() {
      return structuredClone(store.current);
    },
    create: () => notImplemented('create'),
    importFolder: () => notImplemented('importFolder'),
    async save(next) {
      store.current = structuredClone(next);
    },
    addDirection: () => notImplemented('addDirection'),
    async updateDirection(_projectId, directionId, patch) {
      const direction = store.current.directions.find((candidate) => candidate.id === directionId);
      if (!direction) throw new Error(`direction ${directionId} not found`);
      Object.assign(direction, patch);
      return structuredClone(direction);
    },
    projectDir(projectId) {
      return path.join(dataDir, 'projects', projectId);
    },
    saveAttachment: () => notImplemented('saveAttachment'),
    getAttachment: () => notImplemented('getAttachment'),
    readDesignMd: async () => null,
    writeDesignMd: () => notImplemented('writeDesignMd'),
  };
  return store;
}

interface CommitCall {
  title: string;
  meta: VersionMeta;
  directionId: string;
}

interface FakeVersions extends VersionStore {
  commits: CommitCall[];
  statusCalls: number;
}

export function createFakeVersions(): FakeVersions {
  const versions: Version[] = [];
  const store: FakeVersions = {
    commits: [],
    statusCalls: 0,
    async ensureRepo() {},
    async commit(_project, direction: Direction, title, meta) {
      store.commits.push({ title, meta, directionId: direction.id });
      const version: Version = {
        id: `v${versions.length + 1}`,
        directionId: direction.id,
        parentId: direction.headVersionId,
        title,
        meta,
        createdAt: Date.now(),
        changedFiles: [],
      };
      versions.push(version);
      return version;
    },
    async list() {
      return versions;
    },
    async get(_project, versionId) {
      const version = versions.find((candidate) => candidate.id === versionId);
      if (!version) throw new Error('not found');
      return version;
    },
    async status() {
      store.statusCalls += 1;
      return { dirty: true, changed: ['index.html'] };
    },
    commitFile: () => notImplemented('commitFile'),
    discard: () => notImplemented('discard'),
    restore: () => notImplemented('restore'),
    checkoutInto: () => notImplemented('checkoutInto'),
    snapshot: () => notImplemented('snapshot'),
    exportZip: () => notImplemented('exportZip'),
  };
  return store;
}

export function createFakePreview(): PreviewService {
  return {
    async start() {},
    async stop() {},
    directionUrl: () => notImplemented('directionUrl'),
    snapshotUrl: () => notImplemented('snapshotUrl'),
    watch() {},
    unwatch() {},
    async release() {},
    async renderCheck() {
      return [
        { viewport: 'desktop', width: 1440, height: 900, ok: true, consoleErrors: [], pageErrors: [], horizontalOverflow: false, layout: [], layoutTotal: 0, screenshotPath: '' },
        { viewport: 'mobile', width: 375, height: 812, ok: true, consoleErrors: [], pageErrors: [], horizontalOverflow: false, layout: [], layoutTotal: 0, screenshotPath: '' },
      ];
    },
    inspect: () => notImplemented('inspect'),
    screenshot: () => notImplemented('screenshot'),
    screenshotTiles: () => notImplemented('screenshotTiles'),
  };
}

export async function createTempProject(kind: ProjectKind, settings: Partial<ProjectSettings> = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'studio-agent-')));
  const workTree = path.join(root, 'work');
  await mkdir(workTree, { recursive: true });
  const direction: Direction = {
    id: 'd1',
    name: 'main',
    workTree,
    branch: 'd/d1',
    headVersionId: null,
    parentVersionId: null,
    sessionId: null,
    createdAt: Date.now(),
  };
  const project: Project = {
    id: 'p1',
    name: 'Test',
    kind,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    imported: null,
    entry: kind === 'html' ? 'index.html' : 'src/main.tsx',
    settings: { ...DEFAULT_SETTINGS, ...settings },
    directions: [direction],
  };
  return { root, workTree, project, direction };
}
