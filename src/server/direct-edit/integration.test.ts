import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DirectEditResult, Project, StudioEvent, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, EventBus, RunHandle, ServerConfig } from '../types.js';

const PAGE = '<!doctype html>\n<html>\n<head><title>T</title></head>\n<body>\n  <h1 class="t">Hello</h1>\n  <p>One <b>two</b></p>\n</body>\n</html>\n';
const H1 = { file: 'index.html', line: 5, col: 3 };
const P = { file: 'index.html', line: 6, col: 3 };

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let bus: EventBus;
let running: Set<string>;
let app: ReturnType<typeof createApp>;

function fakeRunner(): AgentRunner {
  let count = 0;
  return {
    start() {
      count += 1;
      const handle: RunHandle = { runId: `run${count}`, cancel: () => undefined, done: new Promise(() => undefined) };
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

async function setupProject(): Promise<{ project: Project; workTree: string; base: Version }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html' });
  expect(created.status).toBe(200);
  const project = ((await created.json()) as { project: Project }).project;
  const workTree = projects.mainDirection(project).workTree;
  await writeFile(path.join(workTree, 'index.html'), PAGE);
  const kept = await call('POST', `/api/projects/${project.id}/d/main/keep`);
  expect(kept.status).toBe(200);
  return { project, workTree, base: (await kept.json()) as Version };
}

function directEdit(project: Project, body: unknown): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/direct-edit`, body);
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  const versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  bus = createEventBus(config.dataDir);
  running = new Set();
  app = createApp({ config, bus, projects, versions, runner: fakeRunner(), preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('direct edit route', { timeout: 30000 }, () => {
  it('commits a manual version and undo restores the original bytes', async () => {
    const { project, workTree, base } = await setupProject();
    const seen: StudioEvent[] = [];
    bus.subscribe(project.id, (event) => seen.push(event));
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'red', 'font-size': '20px' } });
    expect(response.status).toBe(200);
    const result = (await response.json()) as DirectEditResult;
    expect(result.file).toBe('index.html');
    expect(result.applied).toEqual({ style: ['color', 'font-size'], text: false });
    expect(result.version).toMatchObject({ title: 'Edit h1: color, font-size', parentId: base.id, meta: { kind: 'manual' }, changedFiles: ['index.html'] });
    expect(result.version.meta.prompt).toContain('color: red');
    const file = path.join(workTree, 'index.html');
    expect(await readFile(file, 'utf8')).toBe(PAGE.replace('<h1 class', '<h1 style="color: red; font-size: 20px;" class'));
    expect(seen.map((event) => event.type)).toEqual(['version.created', 'direction.updated', 'status.changed']);
    expect((await projects.get(project.id)).directions[0]?.headVersionId).toBe(result.version.id);
    expect(await (await call('GET', `/api/projects/${project.id}/d/main/status`)).json()).toEqual({ dirty: false, changed: [] });

    const undo = await call('POST', `/api/projects/${project.id}/d/main/undo`);
    expect(undo.status).toBe(200);
    expect(await readFile(file, 'utf8')).toBe(PAGE);
  });

  it('refuses a stale selection whose tag no longer matches', async () => {
    const { project, workTree, base } = await setupProject();
    const response = await directEdit(project, { source: H1, selector: 'p', tag: 'p', text: 'Changed' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'stale_selection', message: 'The page changed since you selected this element. Select it again.' });
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
    expect((await projects.get(project.id)).directions[0]?.headVersionId).toBe(base.id);
    const matching = await directEdit(project, { source: H1, selector: 'h1', tag: 'h1', text: 'Changed' });
    expect(matching.status).toBe(200);
  });

  it('rejects a tag that is not a lowercase tag name', async () => {
    const { project } = await setupProject();
    const response = await directEdit(project, { source: H1, selector: 'h1', tag: 'H1', text: 'x' });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toBe('invalid_request');
  });

  it('edits text and names the version after the tag', async () => {
    const { project, workTree } = await setupProject();
    const response = await directEdit(project, { source: H1, selector: 'h1', text: 'Café & more' });
    expect(response.status).toBe(200);
    const result = (await response.json()) as DirectEditResult;
    expect(result.version.title).toBe('Edit text of h1');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toContain('<h1 class="t">Café &amp; more</h1>');
  });

  it('does not sweep unfinished changes into the edit version', async () => {
    const { project, workTree } = await setupProject();
    await writeFile(path.join(workTree, 'notes.css'), 'body{}');
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'red' } });
    const result = (await response.json()) as DirectEditResult;
    expect(result.version.changedFiles).toEqual(['index.html']);
    expect(await (await call('GET', `/api/projects/${project.id}/d/main/status`)).json()).toEqual({ dirty: true, changed: ['notes.css'] });
  });

  it('serializes concurrent edits on one direction', async () => {
    const { project, workTree } = await setupProject();
    const responses = await Promise.all([
      directEdit(project, { source: H1, selector: 'h1', style: { color: 'red' } }),
      directEdit(project, { source: H1, selector: 'h1', style: { opacity: '0.5' } }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toMatch(/<h1 style="(color: red; opacity: 0\.5;|opacity: 0\.5; color: red;)" class="t">/);
  });

  it('returns 409 while a run is active on the direction', async () => {
    const { project, workTree } = await setupProject();
    running.add(`${project.id}/main`);
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'red' } });
    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: string }).error).toBe('run_in_progress');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
    running.clear();
    running.add('otherProject/main');
    expect((await directEdit(project, { source: H1, selector: 'h1', style: { color: 'red' } })).status).toBe(200);
  });

  it('returns 422 for paths outside the work tree or in blocked folders', async () => {
    const { project, workTree } = await setupProject();
    const outside = path.join(os.tmpdir(), `studio-outside-${Date.now()}.html`);
    await writeFile(outside, PAGE);
    await symlink(outside, path.join(workTree, 'link.html'));
    await mkdir(path.join(workTree, 'node_modules', 'x'), { recursive: true });
    await writeFile(path.join(workTree, 'node_modules', 'x', 'a.html'), PAGE);
    await writeFile(path.join(workTree, 'script.js'), 'x');
    const cases = [
      { file: '../../../etc/hosts.html', error: 'invalid_source' },
      { file: `../${path.basename(workTree)}/index.html`, error: null },
      { file: outside, error: 'invalid_source' },
      { file: 'link.html', error: 'invalid_source' },
      { file: 'node_modules/x/a.html', error: 'invalid_source' },
      { file: 'Node_Modules/x/a.html', error: 'invalid_source' },
      { file: 'script.js', error: 'invalid_source' },
      { file: 'missing.html', error: 'source_not_found' },
    ];
    for (const entry of cases) {
      const response = await directEdit(project, { source: { ...H1, file: entry.file }, selector: 'h1', style: { color: 'blue' } });
      const body = (await response.json()) as { error?: string };
      expect({ file: entry.file, status: response.status, error: body.error ?? null }).toEqual({
        file: entry.file,
        status: entry.error === null ? 200 : 422,
        error: entry.error,
      });
    }
    expect(await readFile(outside, 'utf8')).toBe(PAGE);
  });

  it('returns 422 for unsafe CSS values and unknown properties', async () => {
    const { project, workTree } = await setupProject();
    const bad = [
      { color: 'red; background: blue' },
      { color: 'url(javascript:alert(1))' },
      { color: 'red}' },
      { color: '<b>' },
      { color: 'a\\b' },
      { color: 'red\nblue' },
      { color: 'x'.repeat(201) },
      { color: '' },
      { position: 'fixed' },
    ];
    for (const style of bad) {
      const response = await directEdit(project, { source: H1, selector: 'h1', style });
      expect({ style, status: response.status }).toEqual({ style, status: 422 });
      expect(((await response.json()) as { error: string }).error).toBe('invalid_request');
    }
    const tooLong = await directEdit(project, { source: H1, selector: 'h1', text: 'x'.repeat(5001) });
    expect(tooLong.status).toBe(422);
    const empty = await directEdit(project, { source: H1, selector: 'h1' });
    expect(empty.status).toBe(422);
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
  });

  it('returns 422 with the message when text cannot be edited', async () => {
    const { project } = await setupProject();
    const response = await directEdit(project, { source: P, selector: 'p', text: 'x' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'text_not_editable',
      message: 'This element has child elements; edit a leaf element or ask the agent',
    });
  });

  it('refuses with 422 when the direction has no base version, so Undo is never lost', async () => {
    const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html' });
    const project = ((await created.json()) as { project: Project }).project;
    const workTree = projects.mainDirection(project).workTree;
    await writeFile(path.join(workTree, 'index.html'), PAGE);
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: 'red' } });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: string }).error).toBe('no_base_version');
    expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(PAGE);
  });

  it('returns 200 with the head version when the edit changes nothing', async () => {
    const { project, base } = await setupProject();
    const response = await directEdit(project, { source: H1, selector: 'h1', style: { color: null } });
    expect(response.status).toBe(200);
    expect(((await response.json()) as DirectEditResult).version.id).toBe(base.id);
  });

  it('edits a TSX file through the same route', async () => {
    const { project, workTree } = await setupProject();
    await mkdir(path.join(workTree, 'src'), { recursive: true });
    const tsx = 'export const A = (): JSX.Element => <h2 style={{ color: "red" }}>x</h2>;\n';
    await writeFile(path.join(workTree, 'src', 'A.tsx'), tsx);
    await call('POST', `/api/projects/${project.id}/d/main/keep`);
    const response = await directEdit(project, { source: { file: 'src/A.tsx', line: 1, col: 37 }, selector: 'h2', style: { color: 'blue' } });
    expect(response.status).toBe(200);
    expect(await readFile(path.join(workTree, 'src', 'A.tsx'), 'utf8')).toBe(tsx.replace('"red"', '"blue"'));
    await call('POST', `/api/projects/${project.id}/d/main/undo`);
    expect(await readFile(path.join(workTree, 'src', 'A.tsx'), 'utf8')).toBe(tsx);
  });
});
