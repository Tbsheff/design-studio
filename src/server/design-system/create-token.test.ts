import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { CreateTokenResult, DirectEditResult, Project, StudioEvent, TokenFile, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, EventBus, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { createPackRegistry } from './packs.js';
import { insertToken } from './token-insert.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const PAGE = '<!doctype html>\n<html>\n<head><title>T</title></head>\n<body>\n  <h1 class="t">Hello</h1>\n  <p>One <b>two</b></p>\n</body>\n</html>\n';
const H1 = { file: 'index.html', line: 5, col: 3 };
const P = { file: 'index.html', line: 6, col: 3 };
const DESIGN_FILES = [TOKENS_FILE, TOKENS_CSS_FILE, 'DESIGN.md'];

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let bus: EventBus;
let running: Set<string>;
let app: ReturnType<typeof createApp>;

function fakeRunner(): AgentRunner {
  return {
    start() {
      const handle: RunHandle = { runId: 'run1', cancel: () => undefined, done: new Promise(() => undefined) };
      return handle;
    },
    get: () => undefined,
    isRunning: (projectId, directionId) => running.has(`${projectId}/${directionId}`),
  };
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function setup(withPack = true): Promise<{ project: Project; workTree: string }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', ...(withPack ? { packId: 'test-pack' } : {}) });
  expect(created.status).toBe(200);
  const project = ((await created.json()) as { project: Project }).project;
  const workTree = projects.mainDirection(project).workTree;
  await writeFile(path.join(workTree, 'index.html'), PAGE);
  expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
  return { project, workTree };
}

function createTokenCall(project: Project, body: unknown): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/design-system/tokens`, body);
}

function directEdit(project: Project, body: unknown): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/direct-edit`, body);
}

async function readAll(workTree: string, files: string[]): Promise<string[]> {
  return Promise.all(files.map((file) => readFile(path.join(workTree, file), 'utf8')));
}

async function listVersions(project: Project): Promise<Version[]> {
  return versions.list(project, projects.mainDirection(await projects.get(project.id)));
}

async function errorOf(response: Response): Promise<{ status: number; error: string }> {
  return { status: response.status, error: ((await response.json()) as { error: string }).error };
}

function expectPureInsertion(before: string, after: string): void {
  let prefix = 0;
  while (prefix < before.length && before[prefix] === after[prefix]) prefix += 1;
  expect(after.slice(after.length - (before.length - prefix))).toBe(before.slice(prefix));
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions, {
    installTemplateDeps: async (cacheDir) => {
      await mkdir(path.join(cacheDir, 'node_modules', 'react'), { recursive: true });
    },
  });
  bus = createEventBus(config.dataDir);
  running = new Set();
  app = createApp({
    config,
    bus,
    projects,
    versions,
    runner: fakeRunner(),
    packs: createPackRegistry(FIXTURES),
    preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' },
  });
});

afterEach(async () => {
  await cleanup();
});

describe('direct edit token references', { timeout: 30000 }, () => {
  it('accepts a known token and a token with a fallback', async () => {
    const { project, workTree } = await setup();
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'var(--primary)' } });
    expect(response.status).toBe(200);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toContain('<h1 style="color: var(--primary);" class="t">');
    const fallback = await directEdit(project, { source: P, selector: 'p', style: { 'margin-top': 'var(--space-4, 16px)' } });
    expect(fallback.status).toBe(200);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toContain('<p style="margin-top: var(--space-4, 16px);">');
  });

  it('refuses an unknown token and a var() without a name', async () => {
    const { project, workTree } = await setup();
    const unknown = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'var(--nope)' } });
    expect(await errorOf(unknown)).toEqual({ status: 422, error: 'unknown_token' });
    const nested = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'var(--primary, var(--nope))' } });
    expect(await errorOf(nested)).toEqual({ status: 422, error: 'unknown_token' });
    const bad = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'var(primary)' } });
    expect(await errorOf(bad)).toEqual({ status: 422, error: 'invalid_token' });
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
  });

  it('allows any token name when the direction has no design system', async () => {
    const { project, workTree } = await setup(false);
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'var(--whatever)' } });
    expect(response.status).toBe(200);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toContain('color: var(--whatever);');
  });
});

describe('create token', { timeout: 60000 }, () => {
  it('adds a token to each group and recompiles tokens.css and DESIGN.md in one version', async () => {
    const { project, workTree } = await setup();
    const cases = [
      { group: 'color', name: 'brand-2', value: '#ff5500', cssVar: '--brand-2' },
      { group: 'font', name: 'serif', value: '"Iowan Old Style", Georgia, serif', cssVar: '--font-serif' },
      { group: 'text', name: 'huge', value: '4.5rem', cssVar: '--text-huge' },
      { group: 'space', name: 'gutter', value: '18px', cssVar: '--space-gutter' },
      { group: 'radius', name: 'xl', value: '1.25em', cssVar: '--radius-xl' },
      { group: 'shadow', name: 'glow', value: '0 0 12px 2px rgb(255 85 0 / 0.4)', cssVar: '--shadow-glow' },
    ];
    for (const item of cases) {
      const before = await readFile(path.join(workTree, TOKENS_FILE), 'utf8');
      const count = (await listVersions(project)).length;
      const response = await createTokenCall(project, { group: item.group, name: item.name, value: item.value });
      expect(response.status, `${item.group}: ${await response.clone().text()}`).toBe(200);
      const result = (await response.json()) as CreateTokenResult;
      expect(result.cssVar).toBe(item.cssVar);
      expect(result.edit).toBeNull();
      expect(result.state.entries.some((entry) => entry.cssVar === item.cssVar)).toBe(true);
      expect(result.version.title).toBe(`Add token ${item.cssVar}`);
      expect(result.version.meta.kind).toBe('manual');
      expect([...result.version.changedFiles].sort()).toEqual([...DESIGN_FILES].sort());
      expect((await listVersions(project)).length).toBe(count + 1);
      const after = await readFile(path.join(workTree, TOKENS_FILE), 'utf8');
      expectPureInsertion(before, after);
      expect(after).toContain(`\n    "${item.name}": {\n      "$value": ${JSON.stringify(item.value)}\n    }\n  }`);
      const [, css, designMd] = await readAll(workTree, DESIGN_FILES);
      expect(css).toContain(`${item.cssVar}: `);
      expect(designMd).toContain(`| \`${item.cssVar}\` |`);
    }
  });

  it('keeps the file order of a group with numeric keys', async () => {
    const { project, workTree } = await setup();
    const response = await createTokenCall(project, { group: 'space', name: 'wide', value: '4rem' });
    expect(response.status, await response.clone().text()).toBe(200);
    const text = await readFile(path.join(workTree, TOKENS_FILE), 'utf8');
    const space = text.slice(text.indexOf('"space"'));
    expect(space.indexOf('"12"')).toBeLessThan(space.indexOf('"wide"'));
    expect(space.indexOf('"$type"')).toBeLessThan(space.indexOf('"wide"'));
    expect(space.indexOf('"wide"')).toBeLessThan(space.indexOf('"radius"'));
  });

  it('accepts digit-led names like space 7 and text 5xl', async () => {
    const { project, workTree } = await setup();
    const space = await createTokenCall(project, { group: 'space', name: '7', value: '1.75rem' });
    expect(space.status, await space.clone().text()).toBe(200);
    const text = await createTokenCall(project, { group: 'text', name: '5xl', value: '4rem' });
    expect(text.status, await text.clone().text()).toBe(200);
    const css = await readFile(path.join(workTree, TOKENS_CSS_FILE), 'utf8');
    expect(css).toContain('--space-7:');
    expect(css).toContain('--text-5xl:');
  });

  it('stores a dark value and a description on a color token', async () => {
    const { project, workTree } = await setup();
    const response = await createTokenCall(project, { group: 'color', name: 'brand-2', value: '#ff5500', darkValue: '#ffaa77', description: 'Second brand colour.' });
    expect(response.status).toBe(200);
    const result = (await response.json()) as CreateTokenResult;
    const tokens = JSON.parse(await readFile(path.join(workTree, TOKENS_FILE), 'utf8')) as TokenFile;
    expect(tokens.color['brand-2']).toEqual({ $value: '#ff5500', $description: 'Second brand colour.', $extensions: { 'studio.modes': { dark: '#ffaa77' } } });
    const entry = result.state.entries.find((item) => item.cssVar === '--brand-2');
    expect(entry?.darkValue).toMatch(/^oklch\(/);
    expect(await readFile(path.join(workTree, TOKENS_CSS_FILE), 'utf8')).toMatch(/\.dark \{[^}]*--brand-2:/);
  });

  it('refuses bad names, bad values and a dark value on a non-color group', async () => {
    const { project, workTree } = await setup();
    const before = await readAll(workTree, DESIGN_FILES);
    const bodies = [
      { group: 'color', name: 'Brand', value: '#fff' },
      { group: 'color', name: 'a_b', value: '#fff' },
      { group: 'color', name: 'a'.repeat(41), value: '#fff' },
      { group: 'color', name: '-x', value: '#fff' },
      { group: 'nope', name: 'x', value: '#fff' },
      { group: 'color', name: 'x', value: 'not-a-colour' },
      { group: 'color', name: 'x', value: 'red; color: blue' },
      { group: 'color', name: 'x', value: '#fff', darkValue: 'nope' },
      { group: 'text', name: 'x', value: '12' },
      { group: 'space', name: 'x', value: '4pt' },
      { group: 'radius', name: 'x', value: 'calc(1px + 2px)' },
      { group: 'font', name: 'x', value: 'Inter; color: red' },
      { group: 'font', name: 'x', value: '<script>' },
      { group: 'shadow', name: 'x', value: '0 0 1px red; x' },
      { group: 'shadow', name: 'x', value: 'url("javascript:x")' },
      { group: 'space', name: 'x', value: '4px', darkValue: '8px' },
      { group: 'color', name: 'x', value: '#fff', extra: true },
    ];
    for (const body of bodies) {
      expect(await errorOf(await createTokenCall(project, body)), JSON.stringify(body)).toEqual({ status: 422, error: 'invalid_request' });
    }
    expect(await readAll(workTree, DESIGN_FILES)).toEqual(before);
  });

  it('refuses an existing path and a css variable that another group already uses', async () => {
    const { project } = await setup();
    expect(await errorOf(await createTokenCall(project, { group: 'color', name: 'primary', value: '#000' }))).toEqual({ status: 409, error: 'token_exists' });
    expect(await errorOf(await createTokenCall(project, { group: 'color', name: 'text-lg', value: '#000' }))).toEqual({ status: 409, error: 'token_exists' });
    expect(await errorOf(await createTokenCall(project, { group: 'color', name: 'space-4', value: '#000' }))).toEqual({ status: 409, error: 'token_exists' });
  });

  it('returns 404 without a design system and 409 while the agent runs', async () => {
    const plain = await setup(false);
    expect(await errorOf(await createTokenCall(plain.project, { group: 'color', name: 'x', value: '#000' }))).toEqual({ status: 404, error: 'no_design_system' });
    const { project, workTree } = await setup();
    running.add(`${project.id}/main`);
    const before = await readAll(workTree, DESIGN_FILES);
    expect(await errorOf(await createTokenCall(project, { group: 'color', name: 'x', value: '#000' }))).toEqual({ status: 409, error: 'run_in_progress' });
    expect(await readAll(workTree, DESIGN_FILES)).toEqual(before);
  });

  it('applies the new token to the selected element in the same version and emits events', async () => {
    const { project, workTree } = await setup();
    const seen: StudioEvent[] = [];
    bus.subscribe(project.id, (event) => seen.push(event));
    const count = (await listVersions(project)).length;
    const response = await createTokenCall(project, {
      group: 'color',
      name: 'brand-2',
      value: 'oklch(62% 0.2 40)',
      apply: { source: H1, selector: 'h1', tag: 'h1', style: { color: 'var(--brand-2)' } },
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as CreateTokenResult;
    expect(result.version.title).toBe('Add token --brand-2 and apply to h1 color');
    expect([...result.version.changedFiles].sort()).toEqual([...DESIGN_FILES, 'index.html'].sort());
    expect(result.edit).toEqual({ file: 'index.html', version: result.version, applied: { style: ['color'], text: false } });
    expect((await listVersions(project)).length).toBe(count + 1);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toContain('<h1 style="color: var(--brand-2);" class="t">');
    const types = seen.map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining(['version.created', 'direction.updated', 'status.changed']));
    const direction = projects.mainDirection(await projects.get(project.id));
    expect(direction.headVersionId).toBe(result.version.id);
    expect(await versions.status(project, direction)).toEqual({ dirty: false, changed: [] });
  });

  it('writes nothing when the apply edit cannot be patched', async () => {
    const { project, workTree } = await setup();
    const before = await readAll(workTree, [...DESIGN_FILES, 'index.html']);
    const stale = await createTokenCall(project, {
      group: 'color',
      name: 'brand-2',
      value: '#ff5500',
      apply: { source: H1, selector: 'h1', tag: 'p', style: { color: 'var(--brand-2)' } },
    });
    expect(await errorOf(stale)).toEqual({ status: 422, error: 'stale_selection' });
    const unknown = await createTokenCall(project, {
      group: 'color',
      name: 'brand-2',
      value: '#ff5500',
      apply: { source: H1, selector: 'h1', style: { color: 'var(--brand-3)' } },
    });
    expect(await errorOf(unknown)).toEqual({ status: 422, error: 'unknown_token' });
    expect(await readAll(workTree, [...DESIGN_FILES, 'index.html'])).toEqual(before);
  });

  it('undo restores tokens.json, tokens.css, DESIGN.md and the source file together', async () => {
    const { project, workTree } = await setup();
    const files = [...DESIGN_FILES, 'index.html'];
    const before = await readAll(workTree, files);
    const response = await createTokenCall(project, {
      group: 'color',
      name: 'brand-2',
      value: '#ff5500',
      darkValue: '#ffaa77',
      apply: { source: H1, selector: 'h1', style: { 'background-color': 'var(--brand-2)' } },
    });
    expect(response.status).toBe(200);
    const changed = await readAll(workTree, files);
    changed.forEach((content, index) => expect(content).not.toBe(before[index]));
    const undo = await call('POST', `/api/projects/${project.id}/d/main/undo`);
    expect(undo.status).toBe(200);
    expect(await readAll(workTree, files)).toEqual(before);
    const state = (await (await call('GET', `/api/projects/${project.id}/d/main/design-system`)).json()) as CreateTokenResult['state'];
    expect(state.entries.some((entry) => entry.cssVar === '--brand-2')).toBe(false);
  });

  it('keeps a linear history when create-token and direct-edit calls run at once', async () => {
    const { project, workTree } = await setup();
    const head = (await listVersions(project))[0] as Version;
    const creates = [1, 2, 3, 4, 5].map((index) =>
      createTokenCall(project, {
        group: 'color',
        name: `brand-${index}`,
        value: `oklch(${50 + index}% 0.15 ${index * 40})`,
        apply: { source: index % 2 === 0 ? P : H1, selector: 'x', style: { color: `var(--brand-${index})` } },
      }),
    );
    const edits = [directEdit(project, { source: P, selector: 'p', style: { 'font-size': '18px' } })];
    const responses = await Promise.all([...creates, ...edits]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 200]);
    const results = (await Promise.all(responses.map((response) => response.json()))) as (CreateTokenResult | DirectEditResult)[];
    const list = await listVersions(project);
    const added = list.slice(0, list.indexOf(list.find((version) => version.id === head.id) as Version));
    expect(added).toHaveLength(6);
    for (let index = 0; index < added.length; index++) {
      expect(added[index]?.parentId).toBe((added[index + 1] ?? head).id);
    }
    expect(new Set(results.map((result) => result.version.id)).size).toBe(6);
    const tokens = JSON.parse(await readFile(path.join(workTree, TOKENS_FILE), 'utf8')) as TokenFile;
    expect([1, 2, 3, 4, 5].every((index) => tokens.color[`brand-${index}`] !== undefined)).toBe(true);
    const css = await readFile(path.join(workTree, TOKENS_CSS_FILE), 'utf8');
    expect([1, 2, 3, 4, 5].every((index) => css.includes(`--brand-${index}:`))).toBe(true);
    const direction = projects.mainDirection(await projects.get(project.id));
    expect(direction.headVersionId).toBe(list[0]?.id);
    expect(await versions.status(project, direction)).toEqual({ dirty: false, changed: [] });
  });
});

describe('insertToken', () => {
  it('appends to an empty group and a one-line group', () => {
    const empty = insertToken('{\n  "color": {}\n}\n', 'color', 'x', { $value: '#fff' });
    expect(empty).toBe('{\n  "color": {\n    "x": {\n      "$value": "#fff"\n    }\n  }\n}\n');
    expect(JSON.parse(insertToken('{"a":{"color":1},"color":{"b":{"$value":"1"}}}', 'color', 'x', { $value: '2' }) ?? '')).toEqual({
      a: { color: 1 },
      color: { b: { $value: '1' }, x: { $value: '2' } },
    });
    expect(insertToken('{"color":"x"}', 'color', 'x', { $value: '1' })).toBeNull();
  });
});
