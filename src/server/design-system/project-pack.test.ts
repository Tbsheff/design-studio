import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { ApplyPackResult, PackSummary, Project, SavePackResult, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig, VersionStore } from '../types.js';
import { REACT_TOKENS_IMPORT } from './packs.js';
import { NOT_WIRED_NOTICE } from './project-pack.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let app: ReturnType<typeof createApp>;
let running: Set<string>;
const temps: string[] = [];

function fakeRunner(): AgentRunner {
  return {
    start: () => ({ runId: 'run1', cancel: () => undefined, done: new Promise(() => undefined) }),
    get: () => undefined,
    isRunning: (pid, did) => running.has(`${pid}/${did}`),
  };
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function ok<T>(response: Response | Promise<Response>): Promise<T> {
  const res = await response;
  const text = await res.text();
  expect(res.status, text).toBe(200);
  return JSON.parse(text) as T;
}

async function create(extra: Record<string, unknown>): Promise<Project> {
  return (await ok<{ project: Project }>(call('POST', '/api/projects', { prompt: 'A page', kind: 'html', startRun: false, ...extra }))).project;
}

const apply = (project: Project, packId: string) => call('POST', `/api/projects/${project.id}/d/main/design-system/apply`, { packId });
const save = (project: Project, body: Record<string, unknown>) => call('POST', `/api/projects/${project.id}/d/main/design-system/save`, body);
const read = (project: Project, file: string) => readFile(path.join(project.directions[0]!.workTree, file), 'utf8');

async function titles(project: Project): Promise<string[]> {
  return (await versions.list(project, project.directions[0]!)).map((version) => version.title);
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions, {
    installTemplateDeps: async (cacheDir) => {
      await mkdir(path.join(cacheDir, 'node_modules', 'react'), { recursive: true });
    },
  });
  running = new Set();
  app = createApp({
    config,
    bus: createEventBus(config.dataDir),
    projects,
    versions,
    runner: fakeRunner(),
    preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' },
  });
});

afterEach(async () => {
  await cleanup();
  while (temps.length) await rm(temps.pop() as string, { recursive: true, force: true });
});

describe('apply or switch a pack on a project', { timeout: 30000 }, () => {
  it('switches packs as one version, keeps project notes, and undo restores the old pack', async () => {
    const project = await create({ packId: 'editorial', designMd: 'Use big type.' });
    const before = await read(project, TOKENS_CSS_FILE);
    const result = await ok<ApplyPackResult>(apply(project, 'brutalist'));
    expect(result.version.title).toBe('Switch to Brutalist design system');
    expect(result.version.changedFiles.sort()).toEqual(['DESIGN.md', PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE].sort());
    expect(result).toMatchObject({ wired: true, notice: null, project: { packId: 'brutalist' }, state: { packId: 'brutalist' } });
    expect(await titles(project)).toEqual(['Switch to Brutalist design system', 'Apply Editorial design system']);
    expect(await read(project, TOKENS_CSS_FILE)).not.toBe(before);
    const designMd = await read(project, 'DESIGN.md');
    expect(designMd.startsWith('# Brutalist')).toBe(true);
    expect(designMd).toContain('## Project notes\n\nUse big type.\n');
    expect(designMd).not.toContain('# Editorial');
    expect((await versions.status(project, project.directions[0]!)).dirty).toBe(false);

    await ok<Version>(call('POST', `/api/projects/${project.id}/d/main/undo`));
    expect(await read(project, TOKENS_CSS_FILE)).toBe(before);
    expect((await projects.get(project.id)).packId).toBe('editorial');
  });

  it('adds a pack to a project without one and keeps its DESIGN.md as project notes', async () => {
    const project = await create({ designMd: 'Plain notes.' });
    const result = await ok<ApplyPackResult>(apply(project, 'editorial'));
    expect(result.version.title).toBe('Apply Editorial design system');
    expect(result.project.packId).toBe('editorial');
    expect(await read(project, 'DESIGN.md')).toContain('## Project notes\n\nPlain notes.\n');
  });

  it('refuses while a run is active, for unknown packs, and when nothing changes', async () => {
    const project = await create({ packId: 'editorial' });
    running.add(`${project.id}/main`);
    const busy = await apply(project, 'brutalist');
    expect(busy.status).toBe(409);
    expect(((await busy.json()) as { error: string }).error).toBe('run_in_progress');
    running.clear();
    expect((await apply(project, 'nope')).status).toBe(400);
    expect((await call('POST', `/api/projects/${project.id}/d/main/design-system/apply`, {})).status).toBe(400);
    expect((await apply(project, 'editorial')).status).toBe(422);
    expect(await read(project, PACK_FILE)).toContain('"id": "editorial"');
    expect(await titles(project)).toEqual(['Apply Editorial design system']);
  });

  it('rewires main.tsx and the font link for a created react project', async () => {
    const project = await create({ kind: 'react', packId: 'editorial' });
    const result = await ok<ApplyPackResult>(apply(project, 'brutalist'));
    expect(result.written).toContain('index.html');
    const html = await read(project, 'index.html');
    expect(html.match(/fonts\.googleapis\.com\/css2/g)?.length).toBe(1);
    expect(html).not.toContain('Fraunces');
    expect((await read(project, 'src/main.tsx')).split('\n')[0]).toBe(REACT_TOKENS_IMPORT);
    expect((await versions.status(project, project.directions[0]!)).dirty).toBe(false);
  });

  it('writes only the design-system files for an imported react project and says so', async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), 'studio import '));
    temps.push(folder);
    await writeFile(path.join(folder, 'package.json'), JSON.stringify({ name: 'x', dependencies: { vite: '^7.0.0' } }));
    await writeFile(path.join(folder, 'index.html'), '<!doctype html><html><head></head><body></body></html>\n');
    await mkdir(path.join(folder, 'src'));
    await writeFile(path.join(folder, 'src', 'main.tsx'), "console.log('hi');\n");
    const project = (await ok<{ project: Project }>(call('POST', '/api/projects/import', { path: folder }))).project;
    const result = await ok<ApplyPackResult>(apply(project, 'editorial'));
    expect(result).toMatchObject({ wired: false, notice: NOT_WIRED_NOTICE });
    expect(result.written.sort()).toEqual(['DESIGN.md', PACK_FILE, TOKENS_CSS_FILE, TOKENS_FILE].sort());
    expect(await readFile(path.join(folder, 'src', 'main.tsx'), 'utf8')).toBe("console.log('hi');\n");
  });
});

describe('save a project design system to the library', { timeout: 30000 }, () => {
  it('round-trips: save, then apply to another project gives the same tokens', async () => {
    const source = await create({ packId: 'editorial', designMd: 'Source-only notes.' });
    const saved = await ok<SavePackResult>(save(source, { name: 'House Style' }));
    expect(saved).toMatchObject({ created: true, pack: { id: 'user-house-style', name: 'House Style', source: 'user', provenance: 'extracted' } });
    const listed = await ok<PackSummary[]>(call('GET', '/api/packs'));
    expect(listed.at(-1)?.id).toBe('user-house-style');
    const detail = await ok<{ designMd: string }>(call('GET', '/api/packs/user-house-style'));
    expect(detail.designMd).not.toContain('studio:tokens');
    expect(detail.designMd).not.toContain('Project notes');
    expect(detail.designMd.startsWith('# Editorial')).toBe(true);

    const target = await create({ packId: 'brutalist', designMd: 'Target notes.' });
    await ok<ApplyPackResult>(apply(target, 'user-house-style'));
    expect(await read(target, TOKENS_FILE)).toBe(await read(source, TOKENS_FILE));
    expect(await read(target, TOKENS_CSS_FILE)).toBe(await read(source, TOKENS_CSS_FILE));
    const targetMd = await read(target, 'DESIGN.md');
    expect(targetMd).toContain('Target notes.');
    expect(targetMd).not.toContain('Source-only notes.');
    expect(JSON.parse(await read(target, PACK_FILE))).toMatchObject({ id: 'user-house-style', name: 'House Style' });
  });

  it('updates the same user pack on save-back and refuses built-in targets', async () => {
    const project = await create({ packId: 'editorial' });
    const first = await ok<SavePackResult>(save(project, { name: 'Mine' }));
    const update = await ok<SavePackResult>(save(project, { name: 'Mine v2', packId: first.pack.id }));
    expect(update).toMatchObject({ created: false, pack: { id: 'user-mine', name: 'Mine v2' } });
    expect((await save(project, { name: 'X', packId: 'editorial' })).status).toBe(400);
    expect((await save(project, { name: '' })).status).toBe(400);
    const plain = await create({});
    expect((await save(plain, { name: 'Nothing' })).status).toBe(404);
  });

  it('points pack.json at the saved pack so a second save updates it in place', async () => {
    const project = await create({ packId: 'editorial' });
    const first = await ok<SavePackResult>(save(project, { name: 'Field Notes' }));
    expect(first).toMatchObject({ created: true, pack: { id: 'user-field-notes' }, version: { title: 'Save Field Notes to library', changedFiles: [PACK_FILE] } });
    expect(JSON.parse(await read(project, PACK_FILE))).toMatchObject({ id: 'user-field-notes', name: 'Field Notes', provenance: 'extracted' });
    expect(first.project.packId).toBe('user-field-notes');
    const state = await ok<{ packId: string }>(call('GET', `/api/projects/${project.id}/d/main/design-system`));
    expect(state.packId).toBe('user-field-notes');

    const again = await ok<SavePackResult>(save(project, { name: 'Field Notes' }));
    expect(again).toMatchObject({ created: false, pack: { id: 'user-field-notes' }, version: null });
    const renamed = await ok<SavePackResult>(save(project, { name: 'Field Notes 2' }));
    expect(renamed).toMatchObject({ created: false, pack: { id: 'user-field-notes', name: 'Field Notes 2' }, version: { title: 'Save Field Notes 2 to library' } });
    const ids = (await ok<PackSummary[]>(call('GET', '/api/packs'))).filter((pack) => pack.source === 'user').map((pack) => pack.id);
    expect(ids).toEqual(['user-field-notes']);
  });

  it('refuses to save while a run edits the direction', async () => {
    const project = await create({ packId: 'editorial' });
    running.add(`${project.id}/main`);
    const response = await save(project, { name: 'Busy' });
    expect(response.status).toBe(409);
  });

  it('rejects an edited pack.json that no longer matches the schema', async () => {
    const project = await create({ packId: 'editorial' });
    await writeFile(path.join(project.directions[0]!.workTree, PACK_FILE), JSON.stringify({ id: 'editorial', name: 'E', extra: 1 }));
    const response = await save(project, { name: 'Broken' });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toContain('pack.json is invalid');
  });
});

describe('library routes', { timeout: 30000 }, () => {
  it('duplicates, renames, deletes and exports over HTTP', async () => {
    const copy = await ok<PackSummary>(call('POST', '/api/packs/editorial/duplicate', {}));
    expect(copy).toMatchObject({ id: 'user-editorial-copy', source: 'user' });
    expect(await ok<PackSummary>(call('PATCH', `/api/packs/${copy.id}`, { name: 'Renamed' }))).toMatchObject({ id: copy.id, name: 'Renamed' });
    const zip = await call('GET', `/api/packs/${copy.id}/export`);
    expect(zip.headers.get('content-type')).toBe('application/zip');
    expect(Buffer.from(await zip.arrayBuffer()).subarray(0, 4).toString('hex')).toBe('504b0304');
    expect((await call('DELETE', '/api/packs/editorial')).status).toBe(400);
    expect(await ok<{ ok: boolean }>(call('DELETE', `/api/packs/${copy.id}`))).toEqual({ ok: true });
    expect((await call('GET', `/api/packs/${copy.id}`)).status).toBe(404);
    expect((await call('POST', '/api/packs', { name: 'x' })).status).toBe(400);
    expect(await ok<unknown[]>(call('GET', '/api/packs/problems'))).toEqual([]);
  });
});
