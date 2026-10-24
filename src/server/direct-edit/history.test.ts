import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EditHistoryState, Project, StudioEvent, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, EventBus, RunHandle, ServerConfig } from '../types.js';
import { createEditHistory, type EditHistory } from './history.js';

const PAGE = '<!doctype html>\n<html>\n<head><title>T</title></head>\n<body>\n  <h1 class="t">Hello</h1>\n  <p>One <b>two</b></p>\n</body>\n</html>\n';
const H1 = { file: 'index.html', line: 5, col: 3 };
const EDITS: Record<string, string>[] = [{ color: 'red' }, { 'font-size': '20px' }, { color: 'blue' }];

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let bus: EventBus;
let history: EditHistory;
let running: Set<string>;
let app: ReturnType<typeof createApp>;

function fakeRunner(): AgentRunner {
  return {
    start(): RunHandle {
      return { runId: 'run1', cancel: () => undefined, done: new Promise(() => undefined) };
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

async function setupProject(): Promise<{ project: Project; file: string }> {
  const created = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html' });
  const project = ((await created.json()) as { project: Project }).project;
  const workTree = projects.mainDirection(project).workTree;
  await writeFile(path.join(workTree, 'index.html'), PAGE);
  expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
  return { project, file: path.join(workTree, 'index.html') };
}

async function edit(project: Project, style: Record<string, string>): Promise<void> {
  const response = await call('POST', `/api/projects/${project.id}/d/main/direct-edit`, { source: H1, selector: 'h1', style });
  expect(response.status).toBe(200);
}

async function step(project: Project, kind: 'undo' | 'redo'): Promise<Response> {
  return call('POST', `/api/projects/${project.id}/d/main/edit-history/${kind}`);
}

async function stateOf(project: Project): Promise<EditHistoryState> {
  return (await call('GET', `/api/projects/${project.id}/edit-history?did=main`)).json() as Promise<EditHistoryState>;
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  const versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  bus = createEventBus(config.dataDir);
  history = createEditHistory({ bus });
  running = new Set();
  app = createApp({ config, bus, projects, versions, runner: fakeRunner(), editHistory: history, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('edit history', { timeout: 30000 }, () => {
  it('undoes three edits to the exact start bytes and redoes them to the exact end bytes', async () => {
    const { project, file } = await setupProject();
    const seen: StudioEvent[] = [];
    bus.subscribe(project.id, (event) => seen.push(event));
    for (const style of EDITS) await edit(project, style);
    const end = await readFile(file, 'utf8');
    expect(end).not.toBe(PAGE);
    expect(await stateOf(project)).toEqual({ canUndo: true, canRedo: false, undoLabel: 'Edit h1: color', redoLabel: null });

    const undone: Version[] = [];
    for (let index = 0; index < 3; index += 1) {
      const response = await step(project, 'undo');
      expect(response.status).toBe(200);
      undone.push(((await response.json()) as { version: Version }).version);
    }
    expect(await readFile(file, 'utf8')).toBe(PAGE);
    expect(undone.map((version) => version.title)).toEqual(['Undo: Edit h1: color', 'Undo: Edit h1: font-size', 'Undo: Edit h1: color']);
    expect(undone.every((version) => version.meta.kind === 'manual')).toBe(true);
    expect((await projects.get(project.id)).directions[0]?.headVersionId).toBe(undone[2]?.id);
    expect(await stateOf(project)).toEqual({ canUndo: false, canRedo: true, undoLabel: null, redoLabel: 'Edit h1: color' });
    expect((await step(project, 'undo')).status).toBe(422);

    for (let index = 0; index < 3; index += 1) expect((await step(project, 'redo')).status).toBe(200);
    expect(await readFile(file, 'utf8')).toBe(end);
    expect(await stateOf(project)).toMatchObject({ canUndo: true, canRedo: false });
    expect(seen.filter((event) => event.type === 'edit-history.changed').length).toBe(9);
  });

  it('refuses when someone else changed the file and clears the stacks', async () => {
    const { project, file } = await setupProject();
    await edit(project, { color: 'red' });
    await edit(project, { color: 'blue' });
    const changed = (await readFile(file, 'utf8')).replace('Hello', 'Hello from the agent');
    await writeFile(file, changed);
    const response = await step(project, 'undo');
    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: string }).error).toBe('history_stale');
    expect(await readFile(file, 'utf8')).toBe(changed);
    expect(await stateOf(project)).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null });
  });

  it('refuses while a run is active on the direction', async () => {
    const { project, file } = await setupProject();
    await edit(project, { color: 'red' });
    const before = await readFile(file, 'utf8');
    running.add(`${project.id}/main`);
    expect((await step(project, 'undo')).status).toBe(409);
    expect(await readFile(file, 'utf8')).toBe(before);
    running.clear();
    expect((await step(project, 'undo')).status).toBe(200);
    expect(await readFile(file, 'utf8')).toBe(PAGE);
  });

  it('clears redo when a new edit is recorded', async () => {
    const { project } = await setupProject();
    await edit(project, { color: 'red' });
    await edit(project, { color: 'blue' });
    expect((await step(project, 'undo')).status).toBe(200);
    expect(await stateOf(project)).toMatchObject({ canRedo: true });
    await edit(project, { 'font-size': '30px' });
    expect(await stateOf(project)).toEqual({ canUndo: true, canRedo: false, undoLabel: 'Edit h1: font-size', redoLabel: null });
    expect((await step(project, 'redo')).status).toBe(422);
  });

  it('undoes and redoes a record with several files together', async () => {
    const { project, file } = await setupProject();
    const workTree = path.dirname(file);
    const other = path.join(workTree, 'about.html');
    await writeFile(other, '<p>About</p>\n');
    expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
    const after = PAGE.replace('Hello', 'Hi');
    await writeFile(file, after);
    await writeFile(other, '<p>About us</p>\n');
    expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
    history.record({
      projectId: project.id,
      directionId: 'main',
      label: 'Batch edit',
      versionId: 'v',
      files: [
        { file, relative: 'index.html', before: PAGE, after },
        { file: other, relative: 'about.html', before: '<p>About</p>\n', after: '<p>About us</p>\n' },
      ],
    });
    const undo = await step(project, 'undo');
    expect(undo.status).toBe(200);
    expect(((await undo.json()) as { version: Version }).version.changedFiles.sort()).toEqual(['about.html', 'index.html']);
    expect(await readFile(file, 'utf8')).toBe(PAGE);
    expect(await readFile(other, 'utf8')).toBe('<p>About</p>\n');

    await writeFile(other, '<p>Changed by someone else</p>\n');
    expect((await step(project, 'redo')).status).toBe(409);
    expect(await readFile(file, 'utf8')).toBe(PAGE);
    expect(await readFile(other, 'utf8')).toBe('<p>Changed by someone else</p>\n');
  });

  it('reports state per direction and skips records that change nothing', () => {
    const small = createEditHistory({ bus: { emit: (event) => ({ ...event, seq: 0, ts: 0 }) as StudioEvent }, limit: 2 });
    for (const label of ['a', 'b', 'c']) {
      small.record({ projectId: 'p', directionId: 'main', label, versionId: label, files: [{ file: '/x', relative: 'x.html', before: '1', after: label }] });
    }
    small.record({ projectId: 'p', directionId: 'main', label: 'same', versionId: 's', files: [{ file: '/x', relative: 'x.html', before: '1', after: '1' }] });
    expect(small.state('p', 'main')).toEqual({ canUndo: true, canRedo: false, undoLabel: 'c', redoLabel: null });
    expect(small.state('p', 'other')).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null });
    expect(small.state('q', 'main').canUndo).toBe(false);
  });
});
