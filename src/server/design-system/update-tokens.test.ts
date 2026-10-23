import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { Project, StudioEvent, TokenChange, TokenPreviewResult, UpdateTokensResult, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, EventBus, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { DARK_SELECTOR, OKLCH_SUPPORTS, SYSTEM_DARK_MEDIA } from './compile.js';
import { createPackRegistry } from './packs.js';
import { updateTitle } from './update-tokens.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const PAGE = '<!doctype html>\n<html>\n<head><title>T</title></head>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>\n';
const DESIGN_FILES = [TOKENS_FILE, TOKENS_CSS_FILE, 'DESIGN.md'];

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let bus: EventBus;
let running: Set<string>;
let app: ReturnType<typeof createApp>;
let baseline = 0;

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

async function setup(): Promise<{ project: Project; workTree: string }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', packId: 'test-pack' });
  expect(created.status).toBe(200);
  const project = ((await created.json()) as { project: Project }).project;
  const workTree = projects.mainDirection(project).workTree;
  await writeFile(path.join(workTree, 'index.html'), PAGE);
  expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
  baseline = (await listVersions(project)).length;
  return { project, workTree };
}

function preview(project: Project, changes: TokenChange[]): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/design-system/preview`, { changes });
}

function update(project: Project, changes: TokenChange[]): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/design-system/tokens/update`, { changes });
}

async function previewCss(project: Project, changes: TokenChange[]): Promise<string> {
  const response = await preview(project, changes);
  expect(response.status).toBe(200);
  const body = (await response.json()) as TokenPreviewResult;
  expect(body.errors).toEqual([]);
  return body.css;
}

async function errorOf(response: Response): Promise<{ status: number; error: string }> {
  return { status: response.status, error: ((await response.json()) as { error: string }).error };
}

async function readAll(workTree: string): Promise<string[]> {
  return Promise.all(DESIGN_FILES.map((file) => readFile(path.join(workTree, file), 'utf8')));
}

async function listVersions(project: Project): Promise<Version[]> {
  return versions.list(project, projects.mainDirection(await projects.get(project.id)));
}

function changedLines(before: string, after: string): { removed: string[]; added: string[] } {
  const a = before.split('\n');
  const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  return { removed: a.slice(start, endA), added: b.slice(start, endB) };
}

function declarationsOf(css: string): string[] {
  return [...css.matchAll(/(--[A-Za-z0-9_-]+):/g)].map((match) => match[1] ?? '');
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

describe('token preview', { timeout: 30000 }, () => {
  it('returns only the changed property in every block the full css uses, and writes nothing', async () => {
    const { project, workTree } = await setup();
    const before = await readAll(workTree);
    const css = await previewCss(project, [{ path: 'radius.md', value: '12px' }]);
    expect(new Set(declarationsOf(css))).toEqual(new Set(['--radius-md']));
    expect(css).toContain(':root {\n  --radius-md: 12px;');
    expect(css).toContain(`${DARK_SELECTOR} {\n  --radius-md: 12px;`);
    expect(css).toContain(SYSTEM_DARK_MEDIA);
    expect(await readAll(workTree)).toEqual(before);
    expect(await listVersions(project)).toHaveLength(baseline);
  });

  it('includes tokens that alias the changed token', async () => {
    const { project } = await setup();
    const css = await previewCss(project, [{ path: 'color.primary', value: '#ff0000' }]);
    expect(new Set(declarationsOf(css))).toEqual(new Set(['--primary', '--ring']));
    expect(css).toContain('--primary: #ff0000;');
    expect(css).toContain('--ring: var(--primary);');
    expect(css).toContain(OKLCH_SUPPORTS);
    expect(css).toMatch(/--primary: oklch\(62\.8/);
  });

  it('emits a new dark value in the dark selectors', async () => {
    const { project } = await setup();
    const css = await previewCss(project, [{ path: 'color.accent', darkValue: '#00ff00' }]);
    const [base] = css.split(OKLCH_SUPPORTS);
    expect(base).toContain(`${DARK_SELECTOR} {\n  --accent: #00ff00;`);
    expect(base).toMatch(/:root \{\n {2}--accent: #[0-9a-f]{6};/);
    expect(base).not.toMatch(/:root \{\n {2}--accent: #00ff00;/);
  });

  it('removing a dark value emits the light value in the dark selectors so the old dark value loses', async () => {
    const { project } = await setup();
    const css = await previewCss(project, [{ path: 'color.primary', darkValue: null }]);
    const [base] = css.split(OKLCH_SUPPORTS);
    const light = /:root \{\n {2}--primary: (#[0-9a-f]+);/.exec(base ?? '')?.[1];
    expect(light).toBeDefined();
    expect(base).toContain(`${DARK_SELECTOR} {\n  --primary: ${light};`);
  });

  it('rejects unknown paths with 404 and bad values with 422', async () => {
    const { project } = await setup();
    expect(await errorOf(await preview(project, [{ path: 'color.nope', value: '#fff' }]))).toEqual({ status: 404, error: 'unknown_token' });
    expect(await errorOf(await preview(project, [{ path: 'color.primary', value: 'not a color' }]))).toEqual({ status: 422, error: 'invalid_request' });
    expect(await errorOf(await preview(project, [{ path: 'radius.md', value: '12 parsecs' }]))).toEqual({ status: 422, error: 'invalid_request' });
    expect(await errorOf(await preview(project, [{ path: 'radius.md', darkValue: '4px' }]))).toEqual({ status: 422, error: 'invalid_request' });
    expect(await errorOf(await preview(project, []))).toEqual({ status: 422, error: 'invalid_request' });
  });

  it('returns compile errors with empty css', async () => {
    const { project } = await setup();
    const response = await preview(project, [{ path: 'color.primary', value: '{color.missing}' }]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as TokenPreviewResult;
    expect(body.css).toBe('');
    expect(body.errors.join(' ')).toContain('color.missing');
    const cycle = (await (await preview(project, [{ path: 'color.primary', value: '{color.ring}' }])).json()) as TokenPreviewResult;
    expect(cycle.css).toBe('');
    expect(cycle.errors.join(' ')).toContain('alias cycle');
  });

  it('sees a tokens.json edit made on disk', async () => {
    const { project, workTree } = await setup();
    await previewCss(project, [{ path: 'radius.md', value: '12px' }]);
    const file = path.join(workTree, TOKENS_FILE);
    const text = await readFile(file, 'utf8');
    await writeFile(file, text.replace('"primary": {', '"primary-2": {'));
    expect((await preview(project, [{ path: 'color.primary', value: '#ff0000' }])).status).toBe(404);
  });

  it('answers 10 changes in under 30 ms', async () => {
    const { project } = await setup();
    const changes: TokenChange[] = [
      { path: 'color.primary', value: '#ff0000' },
      { path: 'color.accent', value: 'oklch(60% 0.2 30)', darkValue: '#00ff00' },
      { path: 'color.bg', darkValue: null },
      { path: 'color.fg', value: 'hsl(200 20% 10%)' },
      { path: 'color.border', value: '#cccccc' },
      { path: 'radius.md', value: '12px' },
      { path: 'radius.lg', value: '20px' },
      { path: 'space.4', value: '18px' },
      { path: 'text.base', value: '1.05rem' },
      { path: 'font.body', value: 'Georgia, serif' },
    ];
    await previewCss(project, changes);
    const times: number[] = [];
    for (let round = 0; round < 10; round++) {
      const started = performance.now();
      await previewCss(project, changes);
      times.push(performance.now() - started);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] ?? Infinity;
    console.log(`token preview 10 changes: median ${median.toFixed(2)} ms, max ${(times.at(-1) ?? 0).toFixed(2)} ms`);
    expect(median).toBeLessThan(30);
  });
});

describe('token update', { timeout: 30000 }, () => {
  it('edits only the changed lines and commits one version with a title', async () => {
    const { project, workTree } = await setup();
    const before = await readFile(path.join(workTree, TOKENS_FILE), 'utf8');
    const seen: StudioEvent[] = [];
    bus.subscribe(project.id, (event) => seen.push(event));
    const response = await update(project, [
      { path: 'color.primary', value: '#ff0000' },
      { path: 'radius.md', value: '12px' },
    ]);
    expect(response.status).toBe(200);
    const result = (await response.json()) as UpdateTokensResult;
    expect(result.version.title).toBe('Update tokens: --primary, --radius-md');
    expect(result.state.entries.find((entry) => entry.cssVar === '--radius-md')?.value).toBe('12px');
    const after = await readFile(path.join(workTree, TOKENS_FILE), 'utf8');
    const diff = changedLines(before, after);
    expect(diff.added.filter((line) => line.includes('#ff0000'))).toHaveLength(1);
    expect(before.split('\n').length).toBe(after.split('\n').length);
    const changed = before.split('\n').filter((line, index) => line !== after.split('\n')[index]);
    expect(changed.map((line) => line.trim())).toEqual(['"$value": "oklch(55% 0.2 260)",', '"$value": "8px"']);
    const css = await readFile(path.join(workTree, TOKENS_CSS_FILE), 'utf8');
    expect(css).toContain('--primary: #ff0000;');
    expect(css).toContain('--radius-md: 12px;');
    expect(await listVersions(project)).toHaveLength(baseline + 1);
    const types = seen.map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining(['version.created', 'direction.updated', 'status.changed']));
    expect(types.filter((type) => type === 'version.created')).toHaveLength(1);
  });

  it('adds and removes the $extensions block for dark values', async () => {
    const { project, workTree } = await setup();
    const file = path.join(workTree, TOKENS_FILE);
    const before = await readFile(file, 'utf8');
    expect((await update(project, [{ path: 'color.accent', darkValue: '#00ff00' }])).status).toBe(200);
    const added = await readFile(file, 'utf8');
    const accent = (JSON.parse(added) as { color: Record<string, unknown> }).color.accent;
    expect(accent).toEqual({ $value: 'oklch(70% 0.15 60)', $extensions: { 'studio.modes': { dark: '#00ff00' } } });
    expect(changedLines(before, added).removed).toEqual(['      "$value": "oklch(70% 0.15 60)"']);
    expect((await update(project, [{ path: 'color.accent', darkValue: null }])).status).toBe(200);
    expect(await readFile(file, 'utf8')).toBe(before);
  });

  it('removes only the dark value of a token that has one', async () => {
    const { project, workTree } = await setup();
    expect((await update(project, [{ path: 'color.primary', darkValue: null }])).status).toBe(200);
    const parsed = JSON.parse(await readFile(path.join(workTree, TOKENS_FILE), 'utf8')) as { color: Record<string, unknown> };
    expect(parsed.color.primary).toEqual({ $value: 'oklch(55% 0.2 260)', $description: 'Primary actions.' });
  });

  it('undo restores tokens.json, tokens.css and DESIGN.md', async () => {
    const { project, workTree } = await setup();
    const before = await readAll(workTree);
    expect((await update(project, [{ path: 'color.primary', value: '#ff0000', darkValue: '#00ff00' }])).status).toBe(200);
    expect(await readAll(workTree)).not.toEqual(before);
    expect((await call('POST', `/api/projects/${project.id}/d/main/undo`)).status).toBe(200);
    expect(await readAll(workTree)).toEqual(before);
  });

  it('refuses while the agent runs, unknown paths, bad values and no-op changes', async () => {
    const { project } = await setup();
    running.add(`${project.id}/main`);
    expect(await errorOf(await update(project, [{ path: 'radius.md', value: '12px' }]))).toEqual({ status: 409, error: 'run_in_progress' });
    running.clear();
    expect(await errorOf(await update(project, [{ path: 'radius.nope', value: '12px' }]))).toEqual({ status: 404, error: 'unknown_token' });
    expect(await errorOf(await update(project, [{ path: 'radius.md', value: 'big' }]))).toEqual({ status: 422, error: 'invalid_request' });
    expect(await errorOf(await update(project, [{ path: 'color.primary', value: '{color.ring}' }]))).toEqual({ status: 422, error: 'invalid_request' });
    expect(await errorOf(await update(project, [{ path: 'radius.md', value: '8px' }]))).toEqual({ status: 422, error: 'no_change' });
    expect(await errorOf(await update(project, [{ path: 'color.accent', darkValue: null }]))).toEqual({ status: 422, error: 'no_change' });
    expect(await listVersions(project)).toHaveLength(baseline);
  });

  it('accepts an alias value and the preview cache sees the commit', async () => {
    const { project } = await setup();
    await previewCss(project, [{ path: 'color.accent', value: '#123456' }]);
    expect((await update(project, [{ path: 'color.accent', value: '{color.primary}' }])).status).toBe(200);
    const css = await previewCss(project, [{ path: 'color.primary', value: '#ff0000' }]);
    expect(new Set(declarationsOf(css))).toEqual(new Set(['--primary', '--ring', '--accent']));
  });

  it('titles more than four tokens with a count', () => {
    const changes = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => ({ path: `space.${name}`, value: '1px' }));
    expect(updateTitle(changes)).toBe('Update tokens: --space-a, --space-b, --space-c, --space-d +2 more');
  });
});
