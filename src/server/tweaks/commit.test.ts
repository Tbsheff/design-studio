import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TOKENS_CSS_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import type { Project, Version } from '../../shared/contracts.js';
import { TWEAKS_FILE, type CommitTweaksResult, type TweakControl, type TweaksState } from '../../shared/tweaks.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createPackRegistry } from '../design-system/packs.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { commitTitle } from './commit.js';
import { defineTweaks } from './store.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'design-system', '__fixtures__');
const PAGE = `<!doctype html>
<html>
<head>
  <title>T</title>
  <style>
    :root { --gap:  24px; --accent: #0f6b5c; --wide: 0; }
    .cards { display: grid; gap: var(--gap); }
    h1 { color: var(--accent); }
    .shell { --cols: calc(1 + var(--wide)); }
  </style>
</head>
<body>
  <h1>Hello</h1>
  <style>
    :root { --gap: 20px; }
  </style>
</body>
</html>
`;

const CONTROLS: TweakControl[] = [
  { id: 'gap', label: 'Gap', group: 'Layout', type: 'range', cssVar: '--gap', min: 0, max: 64, step: 4, unit: 'px', default: 20 },
  { id: 'accent', label: 'Accent', group: 'Color', type: 'color', cssVar: '--accent', default: '#0f6b5c' },
  { id: 'wide', label: 'Wide layout', type: 'toggle', cssVar: '--wide', on: '1', off: '0', default: false },
];

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
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

async function keep(project: Project): Promise<void> {
  expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
}

async function create(kind: 'html' | 'react', packId?: string): Promise<{ project: Project; workTree: string }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind, ...(packId ? { packId } : {}) });
  expect(created.status).toBe(200);
  const project = ((await created.json()) as { project: Project }).project;
  return { project, workTree: projects.mainDirection(project).workTree };
}

async function listVersions(project: Project): Promise<Version[]> {
  return versions.list(project, projects.mainDirection(await projects.get(project.id)));
}

function commit(project: Project, values: Record<string, unknown>): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/tweaks/commit`, { values });
}

async function errorOf(response: Response): Promise<{ status: number; error: string }> {
  return { status: response.status, error: ((await response.json()) as { error: string }).error };
}

const read = (workTree: string, relative: string) => readFile(path.join(workTree, relative), 'utf8');

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
    packs: createPackRegistry(FIXTURES),
    preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' },
  });
});

afterEach(async () => {
  await cleanup();
});

describe('tweaks state', { timeout: 30000 }, () => {
  it('reads controls with the current :root values from the source', async () => {
    const { project, workTree } = await create('html');
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    await defineTweaks(workTree, CONTROLS);
    const response = await call('GET', `/api/projects/${project.id}/d/main/tweaks`);
    const state = (await response.json()) as TweaksState;
    expect(state.controls.map((control) => control.id)).toEqual(['gap', 'accent', 'wide']);
    expect(state.current).toEqual({ gap: 20, accent: '#0f6b5c', wide: false });
    expect(state.problems).toEqual([]);
  });
});

describe('tweaks commit: HTML', { timeout: 30000 }, () => {
  it('rewrites only the value bytes of the last :root declaration in each style block, in one version', async () => {
    const { project, workTree } = await create('html');
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    await defineTweaks(workTree, CONTROLS);
    await keep(project);
    const before = await listVersions(project);
    const tweaksBefore = await read(workTree, TWEAKS_FILE);

    const response = await commit(project, { gap: 32, accent: '#ff3366', wide: true });
    expect(response.status).toBe(200);
    const result = (await response.json()) as CommitTweaksResult;
    expect(result.version.title).toBe('Tweak: Gap, Accent, Wide layout');
    expect(result.state.current).toEqual({ gap: 32, accent: '#ff3366', wide: true });

    const expected = PAGE.replace('--accent: #0f6b5c', '--accent: #ff3366').replace('--wide: 0;', '--wide: 1;').replace('--gap: 20px;', '--gap: 32px;');
    expect(await read(workTree, 'index.html')).toBe(expected);
    expect(expected).toContain('--gap:  24px');
    const saved = JSON.parse(await read(workTree, TWEAKS_FILE)) as { controls: TweakControl[] };
    expect(saved.controls.map((control) => control.default)).toEqual([32, '#ff3366', true]);
    expect(await listVersions(project)).toHaveLength(before.length + 1);

    expect((await call('POST', `/api/projects/${project.id}/d/main/undo`)).status).toBe(200);
    expect(await read(workTree, 'index.html')).toBe(PAGE);
    expect(await read(workTree, TWEAKS_FILE)).toBe(tweaksBefore);
  });

  it('returns 409 while a run is active and 422 for bad values, unknown ids and undeclared vars', async () => {
    const { project, workTree } = await create('html');
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    await defineTweaks(workTree, [...CONTROLS, { id: 'size', label: 'Size', type: 'range', cssVar: '--size', min: 1, max: 4, default: 2 }]);
    await keep(project);
    running.add(`${project.id}/main`);
    expect(await errorOf(await commit(project, { gap: 8 }))).toEqual({ status: 409, error: 'run_in_progress' });
    running.clear();
    expect(await errorOf(await commit(project, { gap: 99 }))).toEqual({ status: 422, error: 'invalid_tweak_value' });
    expect(await errorOf(await commit(project, { accent: 'red; } body { x' }))).toEqual({ status: 422, error: 'invalid_tweak_value' });
    expect(await errorOf(await commit(project, { nope: 1 }))).toEqual({ status: 422, error: 'unknown_tweak' });
    expect(await errorOf(await commit(project, { size: 3 }))).toEqual({ status: 422, error: 'tweak_not_declared' });
    expect(await errorOf(await commit(project, { gap: 20 }))).toEqual({ status: 422, error: 'no_change' });
    expect(await read(workTree, 'index.html')).toBe(PAGE);
  });

  it('returns 404 when the direction has no tweaks', async () => {
    const { project, workTree } = await create('html');
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    await keep(project);
    expect(await errorOf(await commit(project, { gap: 8 }))).toEqual({ status: 404, error: 'no_tweaks' });
  });
});

describe('tweaks commit: React', { timeout: 30000 }, () => {
  it('rewrites the :root declaration in the CSS file', async () => {
    const { project, workTree } = await create('react');
    const cssPath = 'src/App.css';
    const original = await read(workTree, cssPath);
    const css = `${original}\n:root {\n  --radius: 8px;\n}\n\n.hero { border-radius: var(--radius); }\n`;
    await writeFile(path.join(workTree, cssPath), css);
    await defineTweaks(workTree, [{ id: 'radius', label: 'Radius', type: 'range', cssVar: '--radius', min: 0, max: 24, unit: 'px', default: 8 }]);
    await keep(project);
    const response = await commit(project, { radius: 14 });
    expect(response.status).toBe(200);
    expect(await read(workTree, cssPath)).toBe(css.replace('--radius: 8px;', '--radius: 14px;'));
  });
});

describe('tweaks commit: design-system token', { timeout: 30000 }, () => {
  it('updates tokens.json and regenerates tokens.css instead of the page', async () => {
    const { project, workTree } = await create('html', 'test-pack');
    const page = '<!doctype html>\n<html><head><title>T</title></head><body><button style="border-radius: var(--radius-md)">Go</button></body></html>\n';
    await writeFile(path.join(workTree, 'index.html'), page);
    await defineTweaks(workTree, [{ id: 'radius', label: 'Radius', type: 'range', cssVar: '--radius-md', min: 0, max: 32, unit: 'px', default: 8 }]);
    await keep(project);
    const cssBefore = await read(workTree, TOKENS_CSS_FILE);
    const response = await commit(project, { radius: 13 });
    expect(response.status).toBe(200);
    const tokens = JSON.parse(await read(workTree, TOKENS_FILE)) as { radius: { md: { $value: string } } };
    expect(tokens.radius.md.$value).toBe('13px');
    const cssAfter = await read(workTree, TOKENS_CSS_FILE);
    expect(cssAfter).not.toBe(cssBefore);
    expect(cssAfter).toContain('--radius-md: 13px');
    expect(await read(workTree, 'index.html')).toBe(page);
  });
});

describe('tweaks commit: token also declared in the page', { timeout: 30000 }, () => {
  it('updates tokens.json and the page :root override together', async () => {
    const { project, workTree } = await create('html', 'test-pack');
    const page = '<!doctype html>\n<html><head><title>T</title><style>:root { --radius-md: 8px; }</style></head><body><button style="border-radius: var(--radius-md)">Go</button></body></html>\n';
    await writeFile(path.join(workTree, 'index.html'), page);
    await defineTweaks(workTree, [{ id: 'radius', label: 'Radius', type: 'range', cssVar: '--radius-md', min: 0, max: 32, unit: 'px', default: 8 }]);
    await keep(project);
    const response = await commit(project, { radius: 13 });
    expect(response.status).toBe(200);
    expect(((await response.json()) as CommitTweaksResult).state.current).toEqual({ radius: 13 });
    const tokens = JSON.parse(await read(workTree, TOKENS_FILE)) as { radius: { md: { $value: string } } };
    expect(tokens.radius.md.$value).toBe('13px');
    expect(await read(workTree, 'index.html')).toBe(page.replace('--radius-md: 8px;', '--radius-md: 13px;'));
  });
});

describe('commitTitle', () => {
  it('lists up to four labels', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...CONTROLS[1], id: `c${i}`, label: `L${i}` }) as TweakControl);
    expect(commitTitle(many)).toBe('Tweak: L0, L1, L2, L3 +2 more');
  });
});
