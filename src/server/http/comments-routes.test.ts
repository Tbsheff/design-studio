import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DesignComment, Project, RunSummary, SelectionContext } from '../../shared/contracts.js';
import { buildUserText } from '../agent/user-message.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunContext, AgentRunner, RunHandle, ServerConfig } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let started: AgentRunContext[];
let handles: Map<string, RunHandle & { finish: (summary: Partial<RunSummary>) => void; fail: () => void }>;
let runningKeys: Set<string>;
let app: ReturnType<typeof createApp>;

function fakeRunner(): AgentRunner {
  return {
    start(ctx) {
      started.push(ctx);
      const runId = `run${started.length}`;
      let finish: (summary: Partial<RunSummary>) => void = () => undefined;
      let fail: () => void = () => undefined;
      const done = new Promise<RunSummary>((resolve, reject) => {
        finish = (summary) => resolve({ id: runId, status: 'completed', versionId: null, ...summary } as RunSummary);
        fail = () => reject(new Error('boom'));
      });
      handles.set(runId, { runId, cancel: () => undefined, done, finish, fail });
      return handles.get(runId) as RunHandle;
    },
    get: (runId) => handles.get(runId),
    isRunning: (projectId, directionId) => runningKeys.has(`${projectId}/${directionId}`),
  };
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

function selection(selector: string, text: string, line: number): SelectionContext {
  return {
    selector,
    tag: 'h1',
    text,
    outerHTML: `<h1>${text}</h1>`,
    styles: { color: 'rgb(0, 0, 0)', 'font-size': '32px' },
    rect: { x: 10, y: 20, width: 300, height: 40 },
    source: { file: 'index.html', line, col: 5 },
    ancestors: ['body'],
  };
}

async function waitFor<T>(read: () => Promise<T>, ok: (value: T) => boolean): Promise<T> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const value = await read();
    if (ok(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('condition not met');
}

let project: Project;
let base: string;

async function list(): Promise<DesignComment[]> {
  return (await (await call('GET', base)).json()) as DesignComment[];
}

async function add(text: string, line: number, status?: 'draft' | 'queued'): Promise<DesignComment> {
  const context = selection(`body > h1:nth-of-type(${line})`, 'Title', line);
  const response = await call('POST', base, {
    text,
    target: { selector: context.selector, sourceLoc: context.source, tag: 'h1', textSnippet: 'Title', rectHint: context.rect },
    context,
    ...(status ? { status } : {}),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as DesignComment;
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  const versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  started = [];
  handles = new Map();
  runningKeys = new Set();
  app = createApp({
    config,
    bus: createEventBus(config.dataDir),
    projects,
    versions,
    runner: fakeRunner(),
    preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' },
  });
  const response = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html' });
  project = ((await response.json()) as { project: Project }).project;
  base = `/api/projects/${project.id}/d/main/comments`;
  started = [];
});

afterEach(async () => {
  await cleanup();
});

describe('comment routes', { timeout: 20000 }, () => {
  it('validates bodies with zod', async () => {
    expect((await call('POST', base, { text: '', target: {} })).status).toBe(400);
    expect((await call('POST', base, { text: 'x', target: { selector: 'h1', tag: 'h1', textSnippet: '', rectHint: { x: 0, y: 0, width: 1 } } })).status).toBe(
      400,
    );
    const comment = await add('Bigger', 3);
    expect((await call('PATCH', `${base}/${comment.id}`, { color: 'red' })).status).toBe(400);
    expect((await call('PATCH', `${base}/${comment.id}`, { status: 'sent' })).status).toBe(409);
    expect((await call('PATCH', `${base}/nope`, { text: 'x' })).status).toBe(404);
  });

  it('creates, edits, reorders and deletes', async () => {
    const a = await add('One', 3);
    const b = await add('Two', 4);
    const edited = (await (await call('PATCH', `${base}/${a.id}`, { text: 'Uno' })).json()) as DesignComment;
    expect(edited.text).toBe('Uno');
    await call('POST', `${base}/reorder`, { ids: [b.id, a.id] });
    expect((await list()).map((c) => c.text)).toEqual(['Two', 'Uno']);
    expect((await call('DELETE', `${base}/${a.id}`)).status).toBe(200);
    expect((await list()).map((c) => c.text)).toEqual(['Two']);
  });

  it('sends every queued comment in one run and resolves them with the version', async () => {
    const a = await add('Make it red', 3);
    const b = await add('Say hello', 7);
    const fresh = selection('main > h1', 'Fresh title', 9);
    const response = await call('POST', `${base}/send`, { contexts: { [b.id]: fresh } });
    expect(response.status).toBe(200);
    const { runId } = (await response.json()) as { runId: string };
    expect(started).toHaveLength(1);
    const request = started[0]?.request;
    expect(request?.prompt).toBe(`Address 2 comments:\n#${a.n} Make it red\n#${b.n} Say hello`);
    expect(request?.comments?.map((c) => [c.n, c.element?.selector])).toEqual([
      [a.n, 'body > h1:nth-of-type(3)'],
      [b.n, 'main > h1'],
    ]);
    const text = buildUserText({ request: request!, designMd: null, designSystem: null });
    expect(text).toContain('<comments>');
    expect(text).toContain(`<comment number="${b.n}">`);
    expect(text).toContain('source: index.html:9:5');
    expect(text).toContain('Done: #1, #3');
    expect((await list()).map((c) => [c.status, c.runId])).toEqual([
      ['sent', runId],
      ['sent', runId],
    ]);
    handles.get(runId)?.finish({ status: 'completed', versionId: 'v123' });
    const settled = await waitFor(list, (items) => items.every((c) => c.status === 'resolved'));
    expect(settled.map((c) => c.versionId)).toEqual(['v123', 'v123']);
  });

  it('sends one draft now and leaves the queue alone', async () => {
    const queued = await add('Later', 3);
    const now = await add('Now', 4, 'draft');
    const response = await call('POST', `${base}/send`, { ids: [now.id] });
    expect(response.status).toBe(200);
    expect(started[0]?.request.comments?.map((c) => c.id)).toEqual([now.id]);
    const items = await list();
    expect(items.find((c) => c.id === queued.id)?.status).toBe('queued');
    expect(items.find((c) => c.id === now.id)?.status).toBe('sent');
  });

  it('returns comments to the queue when the run fails', async () => {
    await add('Fail me', 3);
    const { runId } = (await (await call('POST', `${base}/send`, {})).json()) as { runId: string };
    handles.get(runId)?.fail();
    await waitFor(list, (items) => items[0]?.status === 'queued');
  });

  it('answers 409 while a run is active and keeps comments queued', async () => {
    const queued = await add('Queued', 3);
    const draft = await add('Now', 4, 'draft');
    runningKeys.add(`${project.id}/main`);
    const response = await call('POST', `${base}/send`, { ids: [draft.id] });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'run_in_progress' });
    expect(started).toHaveLength(0);
    expect((await list()).map((c) => [c.id, c.status])).toEqual([
      [queued.id, 'queued'],
      [draft.id, 'queued'],
    ]);
  });

  it('rejects sending a comment that is not queued or draft', async () => {
    const a = await add('One', 3);
    await call('POST', `${base}/send`, { ids: [a.id] });
    expect((await call('POST', `${base}/send`, { ids: [a.id] })).status).toBe(409);
    expect((await call('POST', `${base}/send`, {})).status).toBe(400);
  });

  it('settles sent comments from the run summary after a restart', async () => {
    const a = await add('One', 3);
    const { runId } = (await (await call('POST', `${base}/send`, { ids: [a.id] })).json()) as { runId: string };
    handles.clear();
    const runsDir = path.join(projects.projectDir(project.id), 'runs');
    await mkdir(runsDir, { recursive: true });
    await writeFile(path.join(runsDir, `${runId}.json`), JSON.stringify({ id: runId, status: 'completed', versionId: 'v9' }));
    const [settled] = await list();
    expect(settled).toMatchObject({ status: 'resolved', versionId: 'v9' });
  });
});
