import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DirectEditBatchResult, Project, StudioEvent, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, EventBus, ServerConfig, VersionStore } from '../types.js';
import { applyDirectEditBatch } from './batch.js';
import type { EditRecord } from './index.js';
import { parseDirectEditBatch } from './validate.js';

const PAGE = '<!doctype html>\n<html>\n<body>\n  <h1 class="t">Hello</h1>\n  <p>One</p>\n  <span style="color: red">Two</span>\n</body>\n</html>\n';
const OTHER = '<!doctype html>\n<html>\n<body>\n  <h2>Other</h2>\n</body>\n</html>\n';
const TSX = 'export const A = (): JSX.Element => <h2 style={{ color: "red" }}>x</h2>;\n';
const H1 = { file: 'index.html', line: 4, col: 3 };
const P = { file: 'index.html', line: 5, col: 3 };
const SPAN = { file: 'index.html', line: 6, col: 3 };
const H2 = { file: 'other.html', line: 4, col: 3 };

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let bus: EventBus;
let app: ReturnType<typeof createApp>;

const runner: AgentRunner = {
  start: () => ({ runId: 'run', cancel: () => undefined, done: new Promise(() => undefined) }),
  get: () => undefined,
  isRunning: () => false,
};

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function setupProject(): Promise<{ project: Project; workTree: string; base: Version }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html' });
  const project = ((await created.json()) as { project: Project }).project;
  const workTree = projects.mainDirection(project).workTree;
  await writeFile(path.join(workTree, 'index.html'), PAGE);
  await writeFile(path.join(workTree, 'other.html'), OTHER);
  await mkdir(path.join(workTree, 'src'), { recursive: true });
  await writeFile(path.join(workTree, 'src', 'A.tsx'), TSX);
  const kept = await call('POST', `/api/projects/${project.id}/d/main/keep`);
  expect(kept.status).toBe(200);
  return { project: await projects.get(project.id), workTree, base: (await kept.json()) as Version };
}

function batch(project: Project, body: unknown): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/direct-edit`, body);
}

async function versionCount(project: Project): Promise<number> {
  return (await versions.list(project, projects.mainDirection(await projects.get(project.id)))).length;
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  bus = createEventBus(config.dataDir);
  app = createApp({ config, bus, projects, versions, runner, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('direct edit batch', { timeout: 30000 }, () => {
  it('applies three edits in one HTML file as one version and keeps other bytes', async () => {
    const { project, workTree, base } = await setupProject();
    const before = await versionCount(project);
    const seen: StudioEvent[] = [];
    bus.subscribe(project.id, (event) => seen.push(event));
    const response = await batch(project, {
      edits: [
        { source: H1, selector: 'h1', style: { color: 'blue' } },
        { source: SPAN, selector: 'span', style: { color: 'blue', 'font-size': '20px' } },
        { source: P, selector: 'p', text: 'Uno & dos' },
      ],
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as DirectEditBatchResult;
    expect(result.files).toEqual(['index.html']);
    expect(result.applied).toEqual([
      { file: 'index.html', style: ['color'], text: false },
      { file: 'index.html', style: ['color', 'font-size'], text: false },
      { file: 'index.html', style: [], text: true },
    ]);
    expect(result.version).toMatchObject({ title: 'Edit 3 elements: color, font-size, text', parentId: base.id, changedFiles: ['index.html'] });
    const expected = PAGE.replace('<h1 class', '<h1 style="color: blue;" class')
      .replace('<p>One</p>', '<p>Uno &amp; dos</p>')
      .replace('style="color: red"', 'style="color: blue; font-size: 20px;"');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(expected);
    expect(await versionCount(project)).toBe(before + 1);
    expect(seen.filter((event) => event.type === 'version.created')).toHaveLength(1);

    expect((await call('POST', `/api/projects/${project.id}/d/main/undo`)).status).toBe(200);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
  });

  it('applies edits in two files as one version', async () => {
    const { project, workTree } = await setupProject();
    const before = await versionCount(project);
    const response = await batch(project, {
      edits: [
        { source: H2, selector: 'h2', style: { opacity: '0.5' } },
        { source: { file: 'src/A.tsx', line: 1, col: 37 }, selector: 'h2', style: { color: 'blue' } },
      ],
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as DirectEditBatchResult;
    expect(result.files).toEqual(['other.html', 'src/A.tsx']);
    expect([...result.version.changedFiles].sort()).toEqual(['other.html', 'src/A.tsx']);
    expect(await readFile(path.join(workTree, 'other.html'), 'utf8')).toBe(OTHER.replace('<h2>', '<h2 style="opacity: 0.5;">'));
    expect(await readFile(path.join(workTree, 'src', 'A.tsx'), 'utf8')).toBe(TSX.replace('"red"', '"blue"'));
    expect(await versionCount(project)).toBe(before + 1);
  });

  it('writes nothing and makes no version when one edit fails', async () => {
    const { project, workTree, base } = await setupProject();
    const response = await batch(project, {
      edits: [
        { source: H2, selector: 'h2', style: { opacity: '0.5' } },
        { source: H1, selector: 'h1', style: { color: 'blue' } },
        { source: { ...P, line: 99 }, selector: 'p', text: 'x' },
      ],
    });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toBe('element_not_found');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
    expect(await readFile(path.join(workTree, 'other.html'), 'utf8')).toBe(OTHER);
    expect((await projects.get(project.id)).directions[0]?.headVersionId).toBe(base.id);
  });

  it('writes back all originals when the commit fails, and records one history entry on success', async () => {
    const { project, workTree } = await setupProject();
    const direction = projects.mainDirection(project);
    const edits = { edits: [{ source: H1, selector: 'h1', style: { color: 'blue' } }, { source: H2, selector: 'h2', text: 'Next' }] };
    const failing: VersionStore = { ...versions, commitFile: () => Promise.reject(new Error('git failed')) };
    await expect(applyDirectEditBatch({ bus, projects, versions: failing, runner }, project, direction, edits)).rejects.toThrow('git failed');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
    expect(await readFile(path.join(workTree, 'other.html'), 'utf8')).toBe(OTHER);

    const records: EditRecord[] = [];
    const result = await applyDirectEditBatch({ bus, projects, versions, runner, history: { record: (entry) => records.push(entry) } }, project, direction, edits);
    expect(records).toHaveLength(1);
    expect(records[0]?.versionId).toBe(result.version.id);
    expect(records[0]?.files.map((file) => [file.relative, file.before, file.after])).toEqual([
      ['index.html', PAGE, await readFile(path.join(workTree, 'index.html'), 'utf8')],
      ['other.html', OTHER, OTHER.replace('<h2>Other</h2>', '<h2>Next</h2>')],
    ]);
  });

  it('returns the head version when no edit changes the source', async () => {
    const { project, base } = await setupProject();
    const response = await batch(project, { edits: [{ source: H1, selector: 'h1', style: { color: null } }] });
    expect(response.status).toBe(200);
    const result = (await response.json()) as DirectEditBatchResult;
    expect(result.files).toEqual([]);
    expect(result.version.id).toBe(base.id);
  });
});

describe('parseDirectEditBatch', () => {
  const edit = { source: H1, selector: 'h1', style: { color: 'blue' } };

  it('accepts 1 to 50 edits', () => {
    expect(parseDirectEditBatch({ edits: [edit] }).edits).toHaveLength(1);
    expect(parseDirectEditBatch({ edits: Array.from({ length: 50 }, () => edit) }).edits).toHaveLength(50);
  });

  it('rejects empty, too long, extra keys, bad edits, rename and move', () => {
    const bad = [
      { edits: [] },
      { edits: Array.from({ length: 51 }, () => edit) },
      { edits: [edit], extra: 1 },
      { edits: [{ ...edit, style: { color: 'red; x: y' } }] },
      { edits: [{ ...edit, name: 'Hero' }] },
      { edits: [{ ...edit, move: 'up' }] },
      { edits: 'x' },
    ];
    for (const raw of bad) expect(() => parseDirectEditBatch(raw), JSON.stringify(raw).slice(0, 60)).toThrow(/Invalid direct edit batch|Edit 1/);
  });
});
