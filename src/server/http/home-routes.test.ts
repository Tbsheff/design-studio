import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClarifyQuestion, DesignComment, Direction, Project, ProjectThumbnail, TrashItem, TrashedProject, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { buildUserText } from '../agent/user-message.js';
import { createEventBus } from '../store/events.js';
import { PREFERENCES_FILE } from '../store/default-folder.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import { createThumbnailService, halfSize, observeBus, wantsThumbnail } from '../thumbnails.js';
import type { AgentRunContext, AgentRunner, EventBus, PreviewService, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let started: AgentRunContext[];
let running: Set<string>;
let app: ReturnType<typeof createApp>;
let bus: EventBus;
let shots: number;

function solidPng(width: number, height: number, shade: number): Buffer {
  const png = new PNG({ width, height });
  png.data.fill(shade);
  return PNG.sync.write(png);
}

function fakePreview(): PreviewService {
  return {
    ...createFakePreview(),
    directionUrl: async () => 'http://127.0.0.1:0/',
    async screenshotTiles(_url, request) {
      shots += 1;
      const file = `${request.outPrefix}-1.png`;
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, solidPng(request.viewport.width, request.viewport.height, shots * 40));
      return { paths: [file], pageHeight: request.viewport.height, from: 0, to: request.viewport.height };
    },
  };
}

function fakeRunner(): AgentRunner {
  return {
    start(ctx) {
      started.push(ctx);
      const handle: RunHandle = { runId: `run${started.length}`, cancel: () => undefined, done: new Promise(() => undefined) };
      return handle;
    },
    get: () => undefined,
    isRunning: (projectId, directionId) => running.has(`${projectId}/${directionId}`),
  };
}

function build(extra: Partial<ServerConfig> = {}): void {
  const preview = fakePreview();
  const observed = observeBus(createEventBus(config.dataDir));
  bus = observed.bus;
  const thumbnails = createThumbnailService({ projects, preview, versions });
  observed.observe((event) => {
    if (wantsThumbnail(event)) thumbnails.schedule(event.projectId);
  });
  app = createApp({ config: { ...config, ...extra }, bus, projects, versions, runner: fakeRunner(), preview, thumbnails });
}

async function call<T>(method: string, url: string, body?: unknown, expected = 200): Promise<T> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  expect(response.status, await response.clone().text()).toBe(expected);
  return (response.headers.get('content-type') ?? '').includes('json') ? ((await response.json()) as T) : (undefined as T);
}

async function fromStarter(starterId: string): Promise<Project> {
  return (await call<{ project: Project }>('POST', '/api/projects/from-starter', { starterId })).project;
}

async function waitFor<T>(read: () => Promise<T | null | undefined>, timeoutMs = 5000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const head = (project: Project): string | null => projects.mainDirection(project).headVersionId;

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  started = [];
  running = new Set();
  shots = 0;
  build();
});

afterEach(async () => {
  await cleanup();
});

describe('home routes', { timeout: 30000 }, () => {
  it('creates each starter with a first version and no run', async () => {
    const list = await call<Array<{ id: string }>>('GET', '/api/starters');
    expect(list.map((starter) => starter.id)).toEqual(['landing', 'dashboard', 'mobile-app', 'deck', 'form', 'docs']);
    for (const { id } of list) {
      const project = await fromStarter(id);
      const html = await readFile(path.join(projects.mainDirection(project).workTree, 'index.html'), 'utf8');
      expect(html).toContain('<h1');
      const history = await call<Version[]>('GET', `/api/projects/${project.id}/d/main/versions`);
      expect(history).toHaveLength(1);
      expect(history[0]?.title).toMatch(/^Starter: /);
    }
    expect(started).toHaveLength(0);
    await call('POST', '/api/projects/from-starter', { starterId: 'nope' }, 400);
  });

  it('makes a sample project with two versions and no run', async () => {
    const { project } = await call<{ project: Project }>('POST', '/api/projects/sample', {});
    const history = await call<Version[]>('GET', `/api/projects/${project.id}/d/main/versions`);
    expect(history.map((version) => version.title)).toEqual(['Sample edit: new headline', 'Starter: Landing page']);
    expect(await readFile(path.join(projects.mainDirection(project).workTree, 'index.html'), 'utf8')).toContain('roasted to order');
    expect(started).toHaveLength(0);
  });

  it('renames a project without touching its folder', async () => {
    const project = await fromStarter('form');
    const folder = projects.mainDirection(project).workTree;
    const renamed = await call<Project>('PATCH', `/api/projects/${project.id}`, { name: '  Studio booking  ' });
    expect(renamed.name).toBe('Studio booking');
    expect((await projects.get(project.id)).name).toBe('Studio booking');
    expect(projects.mainDirection(renamed).workTree).toBe(folder);
    await call('PATCH', `/api/projects/${project.id}`, { name: '   ' }, 400);
  });

  it('duplicates a project with the same head version in a new folder', async () => {
    const project = await fromStarter('docs');
    const { project: copy } = await call<{ project: Project }>('POST', `/api/projects/${project.id}/duplicate`);
    expect(copy.id).not.toBe(project.id);
    expect(copy.name).toBe('Docs copy');
    expect(head(copy)).toBe(head(project));
    const copyTree = projects.mainDirection(copy).workTree;
    expect(copyTree).not.toBe(projects.mainDirection(project).workTree);
    expect(path.dirname(copyTree)).toBe(path.dirname(projects.mainDirection(project).workTree));
    expect(await readFile(path.join(copyTree, 'index.html'), 'utf8')).toBe(await readFile(path.join(projects.mainDirection(project).workTree, 'index.html'), 'utf8'));
    const status = await call<{ dirty: boolean; changed: string[] }>('GET', `/api/projects/${copy.id}/d/main/status`);
    expect(status.changed).toEqual([]);
    const history = await call<Version[]>('GET', `/api/projects/${copy.id}/d/main/versions`);
    expect(history[0]?.id).toBe(head(project));
    const again = await call<{ project: Project }>('POST', `/api/projects/${copy.id}/duplicate`);
    expect(again.project.name).toBe('Docs copy 2');
  });

  it('duplicates every direction at its own head with its comments, and never writes into the source', async () => {
    const project = await fromStarter('docs');
    const sourceTree = projects.mainDirection(project).workTree;
    const extra = await call<Direction>('POST', `/api/projects/${project.id}/directions`, { name: 'Bold' });
    await projects.updateDirection(project.id, extra.id, { variation: { groupId: 'g1', index: 1, count: 2, prompt: 'p', label: 'B', title: 'Bold', brief: 'louder' } });
    await writeFile(path.join(extra.workTree, 'index.html'), '<h1>Bold direction</h1>\n');
    const withExtra = await projects.get(project.id);
    const extraNow = withExtra.directions.find((direction) => direction.id === extra.id) as Direction;
    const bold = await versions.commit(withExtra, extraNow, 'Bold run', { kind: 'run' });
    await projects.updateDirection(project.id, extra.id, { headVersionId: bold?.id ?? null });
    const target = { selector: 'h1', tag: 'h1', textSnippet: 'x', rectHint: { x: 0, y: 0, width: 10, height: 10 } };
    for (const did of ['main', extra.id]) await call('POST', `/api/projects/${project.id}/d/${did}/comments`, { text: `note on ${did}`, target });
    const source = await projects.get(project.id);
    expect(source.directions.find((direction) => direction.id === extra.id)?.headVersionId).not.toBe(head(source));
    const sourceListing = (await readdir(sourceTree)).sort();
    const sourceDirections = (await readdir(path.join(projects.projectDir(project.id), 'directions'))).sort();

    const { project: copy } = await call<{ project: Project }>('POST', `/api/projects/${project.id}/duplicate`);
    expect(copy.directions.map((direction) => [direction.id, direction.name, direction.headVersionId, direction.branch])).toEqual(source.directions.map((direction) => [direction.id, direction.name, direction.headVersionId, direction.branch]));
    const copiedExtra = copy.directions.find((direction) => direction.id === extra.id) as Direction;
    expect(copiedExtra.variation?.title).toBe('Bold');
    expect(copiedExtra.sessionId).toBeNull();
    expect(copiedExtra.workTree).toBe(path.join(projects.projectDir(copy.id), 'directions', extra.id));
    expect(await readFile(path.join(copiedExtra.workTree, 'index.html'), 'utf8')).toBe('<h1>Bold direction</h1>\n');
    expect(await readFile(path.join(projects.mainDirection(copy).workTree, 'index.html'), 'utf8')).toBe(await readFile(path.join(sourceTree, 'index.html'), 'utf8'));
    for (const direction of source.directions) {
      const status = await call<{ changed: string[] }>('GET', `/api/projects/${copy.id}/d/${direction.id}/status`);
      expect(status.changed).toEqual([]);
      const before = await call<DesignComment[]>('GET', `/api/projects/${project.id}/d/${direction.id}/comments`);
      const after = await call<DesignComment[]>('GET', `/api/projects/${copy.id}/d/${direction.id}/comments`);
      expect(after).toHaveLength(1);
      expect(after).toEqual(before);
    }
    expect((await readdir(sourceTree)).sort()).toEqual(sourceListing);
    expect((await readdir(path.join(projects.projectDir(project.id), 'directions'))).sort()).toEqual(sourceDirections);
    expect(await readFile(path.join(extra.workTree, 'index.html'), 'utf8')).toBe('<h1>Bold direction</h1>\n');
  });

  it('lists the trash, deletes one item or all of them forever, and keeps the work tree', async () => {
    expect(await call<TrashItem[]>('GET', '/api/trash')).toEqual([]);
    const first = await fromStarter('form');
    const second = await fromStarter('landing');
    const firstTree = projects.mainDirection(first).workTree;
    await waitFor(async () => (await projects.get(first.id)).thumbnail);
    await waitFor(async () => (await projects.get(second.id)).thumbnail);
    const a = await call<TrashedProject>('DELETE', `/api/projects/${first.id}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const b = await call<TrashedProject>('DELETE', `/api/projects/${second.id}`);
    const list = await call<TrashItem[]>('GET', '/api/trash');
    expect(list.map((item) => item.trashId)).toEqual([b.trashId, a.trashId]);
    expect(list[1]).toMatchObject({ projectId: first.id, name: 'Form', thumbnail: true, folderStays: true });
    expect(list[1]?.trashedAt).toBeGreaterThan(0);
    const png = await app.request(`/api/trash/${a.trashId}/thumbnail`, { headers: { 'x-studio-token': config.studioToken } });
    expect(png.status).toBe(200);
    expect(png.headers.get('content-type')).toBe('image/png');

    for (const bad of ['..', '.', '..%2F..', 'a%2F..%2F..']) {
      const response = await app.request(`/api/trash/${bad}`, { method: 'DELETE', headers: { 'x-studio-token': config.studioToken } });
      expect([400, 404]).toContain(response.status);
    }
    await call('DELETE', '/api/trash/nope-123', undefined, 404);
    expect((await app.request(`/api/trash/${a.trashId}`, { method: 'DELETE' })).status).toBe(403);
    expect((await app.request('/api/trash', { method: 'DELETE' })).status).toBe(403);
    expect((await app.request('/api/trash')).status).toBe(403);
    expect(existsSync(path.join(config.dataDir, 'trash', 'projects', a.trashId))).toBe(true);
    expect(existsSync(path.join(config.dataDir, 'projects'))).toBe(true);

    expect(await call<{ deleted: number }>('DELETE', `/api/trash/${a.trashId}`)).toEqual({ deleted: 1 });
    expect(existsSync(path.join(config.dataDir, 'trash', 'projects', a.trashId))).toBe(false);
    expect(existsSync(path.join(firstTree, 'index.html'))).toBe(true);
    expect((await call<TrashItem[]>('GET', '/api/trash')).map((item) => item.trashId)).toEqual([b.trashId]);
    await call('POST', `/api/trash/${a.trashId}/restore`, undefined, 404);

    expect(await call<{ deleted: number }>('DELETE', '/api/trash')).toEqual({ deleted: 1 });
    expect(await call<TrashItem[]>('GET', '/api/trash')).toEqual([]);
    expect(existsSync(path.join(projects.mainDirection(second).workTree, 'index.html'))).toBe(true);
    expect(existsSync(path.join(config.dataDir, 'trash', 'projects'))).toBe(true);
  });

  it('moves a deleted project to the trash and restores it, even after a late event', async () => {
    const project = await fromStarter('deck');
    const folder = projects.mainDirection(project).workTree;
    running.add(`${project.id}/main`);
    await call('DELETE', `/api/projects/${project.id}`, undefined, 409);
    running.clear();
    const trashed = await call<TrashedProject>('DELETE', `/api/projects/${project.id}`);
    expect(trashed.projectId).toBe(project.id);
    expect((await projects.list()).map((item) => item.id)).not.toContain(project.id);
    expect(existsSync(folder)).toBe(true);
    expect(existsSync(path.join(config.dataDir, 'trash', 'projects', trashed.trashId, 'project.json'))).toBe(true);
    bus.emit({ type: 'status.changed', projectId: project.id, directionId: 'main', status: { dirty: false, changed: [] } });
    const { project: back } = await call<{ project: Project }>('POST', `/api/trash/${trashed.trashId}/restore`);
    expect(back.id).toBe(project.id);
    expect(head(back)).toBe(head(project));
    expect((await projects.list()).map((item) => item.id)).toContain(project.id);
    const events = await readFile(path.join(projects.projectDir(project.id), 'events.jsonl'), 'utf8');
    expect(events).toContain('status.changed');
    await call('POST', `/api/trash/${trashed.trashId}/restore`, undefined, 404);
  });

  it('saves a half-size thumbnail of the head after a new version and serves it', async () => {
    const project = await fromStarter('landing');
    const first = await waitFor(async () => (await projects.get(project.id)).thumbnail);
    expect(first.versionId).toBe(head(project));
    const bytes = await waitFor(async () => {
      const response = await app.request(`/api/projects/${project.id}/thumbnail/${first.versionId}`, { headers: { 'x-studio-token': config.studioToken } });
      return response.status === 200 ? Buffer.from(await response.arrayBuffer()) : null;
    });
    const png = PNG.sync.read(bytes);
    expect([png.width, png.height]).toEqual([640, 400]);
    const updated = await projects.get(project.id);
    expect(updated.updatedAt).toBe(project.updatedAt);
    await writeFile(path.join(projects.mainDirection(project).workTree, 'index.html'), '<h1>Second</h1>');
    const version = await versions.commit(updated, projects.mainDirection(updated), 'Run 2', { kind: 'run' });
    if (!version) throw new Error('no version');
    await projects.updateDirection(project.id, 'main', { headVersionId: version.id });
    bus.emit({ type: 'version.created', projectId: project.id, directionId: 'main', version });
    const second = await waitFor<ProjectThumbnail>(async () => {
      const thumb = (await projects.get(project.id)).thumbnail;
      return thumb && thumb.versionId === version.id ? thumb : null;
    });
    expect(second.versionId).not.toBe(first.versionId);
    const files = await readdir(path.join(projects.projectDir(project.id), 'thumbs'));
    expect(files.sort()).toEqual([`${first.versionId}.png`, `${version.id}.png`].sort());
    const status = await call<{ dirty: boolean; changed: string[] }>('GET', `/api/projects/${project.id}/d/main/status`);
    expect(status.changed).toEqual([]);
  });

  it('asks questions for a short prompt only', async () => {
    const short = await call<{ questions: ClarifyQuestion[] }>('POST', '/api/clarify', { prompt: 'A page for my bakery' });
    expect(short.questions.length).toBeGreaterThan(0);
    expect(short.questions.length).toBeLessThanOrEqual(3);
    const long = await call<{ questions: ClarifyQuestion[] }>('POST', '/api/clarify', { prompt: 'A pricing page for a developer tool with three tiers, a comparison table and an FAQ' });
    expect(long.questions).toHaveLength(0);
  });

  it('keeps the onboarding flag in preferences without losing other keys', async () => {
    await writeFile(path.join(config.dataDir, PREFERENCES_FILE), JSON.stringify({ version: 1, projectsDir: config.projectsDir }));
    expect(await call<{ dismissed: boolean }>('GET', '/api/onboarding')).toEqual({ dismissed: false });
    await call('POST', '/api/onboarding/dismiss');
    expect(await call<{ dismissed: boolean }>('GET', '/api/onboarding')).toEqual({ dismissed: true });
    const saved = JSON.parse(await readFile(path.join(config.dataDir, PREFERENCES_FILE), 'utf8')) as Record<string, unknown>;
    expect(saved).toEqual({ version: 1, projectsDir: config.projectsDir, onboardingDismissed: true });
  });

  it('puts a captured reference page into the run prompt', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>Northwind Tea</title><script>alert(1)</script></head><body><nav><a href="#">Shop</a></nav><h1>Loose leaf, shipped fresh</h1><p>Three blends a month.</p></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      build({ fetchAllowLoopback: true });
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
      await call('POST', '/api/projects', { prompt: 'A tea shop page like this one', kind: 'html', referenceUrls: [url] });
      const request = started[0]?.request;
      expect(request?.referencePages?.[0]).toMatchObject({ url, title: 'Northwind Tea' });
      const text = buildUserText({ request: request!, designMd: null, designSystem: null });
      expect(text).toContain('<reference-page');
      expect(text).toContain('# Loose leaf, shipped fresh');
      expect(text).toContain('Three blends a month.');
      expect(text).not.toContain('alert(1)');
      expect(text).toContain('untrusted');
      build();
      await call('POST', '/api/projects', { prompt: 'x', kind: 'html', referenceUrls: [url] }, 400);
    } finally {
      server.close();
    }
  });

  it('halves a PNG with a box filter', () => {
    const png = PNG.sync.read(halfSize(solidPng(10, 6, 200)));
    expect([png.width, png.height]).toEqual([5, 3]);
    expect(png.data[0]).toBe(200);
  });
});
