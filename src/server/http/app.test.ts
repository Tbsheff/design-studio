import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, Version } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunContext, AgentRunner, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let started: AgentRunContext[];
let runningKeys: Set<string>;
let app: ReturnType<typeof createApp>;

function fakeRunner(): AgentRunner {
  return {
    start(ctx) {
      started.push(ctx);
      const handle: RunHandle = { runId: `run${started.length}`, cancel: () => undefined, done: new Promise(() => undefined) };
      return handle;
    },
    get: () => undefined,
    isRunning: (projectId, directionId) => runningKeys.has(`${projectId}/${directionId}`),
  };
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function createHtml(extra: Record<string, unknown> = {}): Promise<Project> {
  const response = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', ...extra });
  expect(response.status).toBe(200);
  return ((await response.json()) as { project: Project }).project;
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  started = [];
  runningKeys = new Set();
  app = createApp({ config, bus: createEventBus(config.dataDir), projects, versions, runner: fakeRunner(), preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('http app', { timeout: 20000 }, () => {
  it('accepts every setting at create time', async () => {
    const settings = { model: 'claude-haiku-5-5', maxBudgetUsd: 0.5, maxTurns: 7, allowBash: true, allowInstall: true, disabledSkills: ['personal:a', 'plugin-x:b'], defaultLevel: 'polish' as const };
    const project = await createHtml({ settings });
    expect(project.settings).toEqual(settings);
    expect((await projects.get(project.id)).settings).toEqual(settings);
  });

  it('creates a project without a first run when startRun is false, ready for a variations fan-out', async () => {
    const response = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', startRun: false, settings: { defaultLevel: 'wireframe' } });
    expect(response.status).toBe(200);
    const { project, runId } = (await response.json()) as { project: Project; runId: string | null };
    expect(runId).toBeNull();
    expect(started).toHaveLength(0);
    expect((await projects.get(project.id)).settings.defaultLevel).toBe('wireframe');
    expect(projects.mainDirection(project).headVersionId).toBeNull();

    const briefs = await call('POST', `/api/projects/${project.id}/variations/briefs`, { prompt: 'A page', count: 3, fromDirectionId: null });
    expect(briefs.status).toBe(200);
    const { briefs: list } = (await briefs.json()) as { briefs: unknown[] };
    const fan = await call('POST', `/api/projects/${project.id}/variations`, { prompt: 'A page', briefs: list, fromDirectionId: null });
    expect(fan.status).toBe(200);
    const result = (await fan.json()) as { items: { runId: string | null; error: string | null }[] };
    expect(result.items).toHaveLength(3);
    expect(result.items.every((item) => item.runId && !item.error)).toBe(true);
    expect(started).toHaveLength(3);
    expect(started.every((ctx) => ctx.request.level === 'wireframe')).toBe(true);
  });

  it('starts the first run by default and rejects a bad startRun flag before creating anything', async () => {
    const ok = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', startRun: true });
    expect(((await ok.json()) as { runId: string | null }).runId).toBe('run1');
    expect(started).toHaveLength(1);
    const before = (await projects.list()).length;
    const bad = await call('POST', '/api/projects', { prompt: 'A page', kind: 'html', startRun: 'no' });
    expect(bad.status).toBe(400);
    expect((await projects.list()).length).toBe(before);
  });

  it('rejects settings out of range at create time', async () => {
    const response = await call('POST', '/api/projects', { prompt: 'x', kind: 'html', settings: { maxBudgetUsd: 51 } });
    expect(response.status).toBe(400);
  });

  it('PATCH settings updates and validates', async () => {
    const project = await createHtml();
    const ok = await call('PATCH', `/api/projects/${project.id}/settings`, { allowBash: true, maxTurns: 12 });
    expect(ok.status).toBe(200);
    const updated = (await ok.json()) as Project;
    expect(updated.settings).toMatchObject({ allowBash: true, allowInstall: false, maxTurns: 12 });
    expect((await projects.get(project.id)).settings.allowBash).toBe(true);
    expect(project.settings.maxBudgetUsd).toBeNull();
    const limited = await call('PATCH', `/api/projects/${project.id}/settings`, { maxBudgetUsd: 1.25 });
    expect(((await limited.json()) as Project).settings.maxBudgetUsd).toBe(1.25);
    const cleared = await call('PATCH', `/api/projects/${project.id}/settings`, { maxBudgetUsd: null });
    expect(((await cleared.json()) as Project).settings.maxBudgetUsd).toBeNull();
    for (const bad of [{ maxBudgetUsd: 0.001 }, { maxBudgetUsd: 60 }, { maxTurns: 0 }, { maxTurns: 201 }, { maxTurns: 1.5 }, { allowBash: 'yes' }, { model: '' }, { other: 1 }, { defaultLevel: 'max' }]) {
      const response = await call('PATCH', `/api/projects/${project.id}/settings`, bad);
      expect({ bad, status: response.status }).toEqual({ bad, status: 400 });
    }
    expect((await call('PATCH', '/api/projects/nope123456/settings', { maxTurns: 3 })).status).toBe(404);
  });

  it('writes DESIGN.md from the create request before the first run', async () => {
    const project = await createHtml({ designMd: '# Brand\nprimary #0B6E4F' });
    const file = path.join(projects.mainDirection(project).workTree, 'DESIGN.md');
    expect(await readFile(file, 'utf8')).toBe('# Brand\nprimary #0B6E4F');
    expect(started[0]?.designMd).toBe('# Brand\nprimary #0B6E4F');
  });

  it('PUT design-md commits a manual version and leaves the tree clean', async () => {
    const project = await createHtml();
    const response = await call('PUT', `/api/projects/${project.id}/design-md`, { content: '# Tokens' });
    expect(response.status).toBe(200);
    const listed = (await (await call('GET', `/api/projects/${project.id}/d/main/versions`)).json()) as Version[];
    expect(listed[0]).toMatchObject({ title: 'Update DESIGN.md', meta: { kind: 'manual' }, changedFiles: ['DESIGN.md'] });
    expect(await (await call('GET', `/api/projects/${project.id}/d/main/status`)).json()).toEqual({ dirty: false, changed: [] });
  });

  it('returns 409 for a second run on a direction with an active run', async () => {
    const project = await createHtml();
    runningKeys.add(`${project.id}/main`);
    const response = await call('POST', `/api/projects/${project.id}/d/main/runs`, { prompt: 'again' });
    expect(response.status).toBe(409);
    expect(started).toHaveLength(1);
  });

  it('starts a fresh agent session after a restore or an undo, keeps it after keep, and passes no old session to the next run', async () => {
    const project = await createHtml();
    const workTree = projects.mainDirection(project).workTree;
    const mainOf = async () => projects.mainDirection(await projects.get(project.id));
    const write = async (text: string) => {
      await writeFile(path.join(workTree, 'index.html'), `<!doctype html><html><body><h1>${text}</h1></body></html>`);
      expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
    };
    await write('one');
    const first = (await mainOf()).headVersionId;
    await write('two');
    await projects.updateDirection(project.id, 'main', { sessionId: 'sess-old', sessionCostUsd: 0.4 });
    await write('three');
    expect((await mainOf()).sessionId).toBe('sess-old');

    expect((await call('POST', `/api/projects/${project.id}/d/main/restore`, { versionId: first })).status).toBe(200);
    expect(await mainOf()).toMatchObject({ sessionId: null, sessionCostUsd: 0, sessionResetReason: 'restore' });
    expect((await call('POST', `/api/projects/${project.id}/d/main/runs`, { prompt: 'polish', level: 'polish' })).status).toBe(200);
    expect(started.at(-1)?.direction).toMatchObject({ sessionId: null, sessionResetReason: 'restore' });

    await projects.updateDirection(project.id, 'main', { sessionId: 'sess-new', sessionResetReason: null });
    expect((await call('POST', `/api/projects/${project.id}/d/main/undo`)).status).toBe(200);
    expect(await mainOf()).toMatchObject({ sessionId: null, sessionResetReason: 'undo' });
  });

  it('serializes direct edits and undo on one direction', { timeout: 60000 }, async () => {
    const project = await createHtml();
    const workTree = projects.mainDirection(project).workTree;
    await writeFile(path.join(workTree, 'index.html'), '<!doctype html>\n<html><body>\n<h1>Title</h1>\n</body></html>\n');
    expect((await call('POST', `/api/projects/${project.id}/d/main/keep`)).status).toBe(200);
    let commits = 1;
    for (let round = 0; round < 20; round += 1) {
      const [edit, undo] = await Promise.all([
        call('POST', `/api/projects/${project.id}/d/main/direct-edit`, {
          source: { file: 'index.html', line: 3, col: 1 },
          selector: 'h1',
          style: { color: `rgb(${round}, 0, 0)` },
        }),
        call('POST', `/api/projects/${project.id}/d/main/undo`),
      ]);
      expect(edit.status).toBe(200);
      expect([200, 400]).toContain(undo.status);
      const editBody = (await edit.json()) as { version: Version };
      if (editBody.version.meta.kind === 'manual') commits += 1;
      if (undo.status === 200) commits += 1;
      const current = await projects.get(project.id);
      const head = projects.mainDirection(current).headVersionId;
      if (head === null) throw new Error('no head');
      const snapshot = await versions.snapshot(current, head);
      expect(await readFile(path.join(workTree, 'index.html'), 'utf8')).toBe(await readFile(path.join(snapshot, 'index.html'), 'utf8'));
    }
    const listed = (await (await call('GET', `/api/projects/${project.id}/d/main/versions`)).json()) as Version[];
    expect(listed).toHaveLength(commits);
    for (let index = 0; index < listed.length - 1; index += 1) expect(listed[index]?.parentId).toBe(listed[index + 1]?.id);
    expect(listed[listed.length - 1]?.parentId).toBeNull();
    expect(listed[0]?.id).toBe(projects.mainDirection(await projects.get(project.id)).headVersionId);
  });

  it('GET /api/runs/:id returns the sent-message log apart from the chat events', async () => {
    const project = await createHtml();
    const runsDir = path.join(projects.projectDir(project.id), 'runs');
    await mkdir(runsDir, { recursive: true });
    const startedEvent = { type: 'run.started', runId: 'logged', request: { prompt: 'x', mode: 'edit' }, seq: 1, ts: 1, projectId: project.id, directionId: 'main' };
    const sent = { type: 'run.sent', runId: 'logged', projectId: project.id, directionId: 'main', ts: 2, text: 'x', imageCount: 0, updatedInstructions: false, recommendedSkills: [], promptHash: 'h', resume: null };
    await writeFile(path.join(runsDir, 'logged.jsonl'), `${JSON.stringify(startedEvent)}\n${JSON.stringify(sent)}\n`);
    const response = await call('GET', '/api/runs/logged');
    const body = (await response.json()) as { events: { type: string }[]; sent: { type: string }[] };
    expect(body.events.map((event) => event.type)).toEqual(['run.started']);
    expect(body.sent).toEqual([sent]);
  });

  it('rejects SVG and other non-raster attachments', async () => {
    const project = await createHtml();
    const upload = (name: string, type: string) => {
      const form = new FormData();
      form.append('file', new File([new Uint8Array([1, 2, 3])], name, { type }));
      return app.request(`/api/projects/${project.id}/attachments`, { method: 'POST', headers: { 'x-studio-token': config.studioToken }, body: form });
    };
    const svg = await upload('logo.svg', 'image/svg+xml');
    expect(svg.status).toBe(400);
    expect(((await svg.json()) as { error: string }).error).toMatch(/PNG, JPEG, GIF or WebP/);
    expect((await upload('logo.svg', 'image/png')).status).toBe(400);
    expect((await upload('doc.pdf', 'application/pdf')).status).toBe(400);
    for (const [name, type] of [['a.png', 'image/png'], ['a.jpg', 'image/jpeg'], ['a.gif', 'image/gif'], ['a.webp', 'image/webp']] as const) {
      expect((await upload(name, type)).status).toBe(200);
    }
  });
});
