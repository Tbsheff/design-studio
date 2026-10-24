import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Direction, Project, RunSummary, Version } from '../../shared/contracts.js';
import { forkBaseOf } from '../../shared/rewind.js';
import { createAgentRunner } from '../agent/index.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';

const run = promisify(execFile);

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let runner: AgentRunner;
let app: ReturnType<typeof createApp>;

async function call<T = unknown>(method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await app.request(url, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as T };
}

async function finished(runId: string): Promise<RunSummary> {
  for (let i = 0; i < 400; i += 1) {
    const { data } = await call<{ summary: RunSummary | null }>('GET', `/api/runs/${runId}`);
    if (data.summary && data.summary.status !== 'running' && !runner.isRunning(data.summary.projectId, data.summary.directionId)) return data.summary;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const last = await call<{ summary: RunSummary | null; events: { type: string }[] }>("GET", `/api/runs/${runId}`);
  throw new Error(`run ${runId} did not finish ${JSON.stringify({ status: last.data.summary?.status, error: last.data.summary?.error, live: Boolean(runner.get(runId)), events: last.data.events.map((e) => e.type).slice(-6) })}`);
}

async function send(pid: string, did: string, prompt: string): Promise<RunSummary> {
  const { status, data } = await call<{ runId: string }>('POST', `/api/projects/${pid}/d/${did}/runs`, { prompt, mode: 'edit' });
  expect(status).toBe(200);
  return finished(data.runId);
}

async function treeOf(pid: string, commit: string): Promise<string> {
  const { stdout } = await run('git', ['--git-dir', path.join(projects.projectDir(pid), 'git'), 'rev-parse', `${commit}^{tree}`]);
  return stdout.trim();
}

async function fileAt(pid: string, commit: string, file: string): Promise<string> {
  const { stdout } = await run('git', ['--git-dir', path.join(projects.projectDir(pid), 'git'), 'show', `${commit}:${file}`]);
  return stdout;
}

async function fourMessages(): Promise<{ project: Project; runs: RunSummary[] }> {
  const created = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'Harbor Lane Coffee', kind: 'html', startRun: false });
  expect(created.status).toBe(200);
  const project = created.data.project;
  const runs: RunSummary[] = [];
  for (const prompt of ['Harbor Lane Coffee', 'Add a menu section', 'Add opening hours', 'Add a contact form']) runs.push(await send(project.id, 'main', prompt));
  for (const summary of runs) expect(summary.versionId).toMatch(/^[0-9a-f]{40}$/);
  return { project, runs };
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  config = { ...config, agentMode: 'mock' };
  const versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  const bus = createEventBus(config.dataDir);
  const preview = { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' };
  runner = createAgentRunner({ config, bus, projects, versions, preview });
  app = createApp({ config, bus, projects, versions, runner, preview });
});

afterEach(async () => {
  await cleanup();
});

describe('R7-4 rewind per message', { timeout: 60_000 }, () => {
  it('restore at message 2 of 4 makes the files equal the version that message made', async () => {
    const { project, runs } = await fourMessages();
    const second = runs[1]?.versionId as string;
    const restored = await call<Version>('POST', `/api/projects/${project.id}/d/main/restore`, { versionId: second });
    expect(restored.status).toBe(200);
    expect(await treeOf(project.id, restored.data.id)).toBe(await treeOf(project.id, second));
    const workTree = projects.mainDirection(await projects.get(project.id)).workTree;
    const onDisk = await readFile(path.join(workTree, 'index.html'), 'utf8');
    expect(onDisk).toBe(await fileAt(project.id, second, 'index.html'));
    expect(onDisk).toContain('Add a menu section');
    expect(onDisk).not.toContain('Add opening hours');
    expect(projects.mainDirection(await projects.get(project.id))).toMatchObject({ headVersionId: restored.data.id, sessionId: null, sessionResetReason: 'restore' });
  });

  it('edit and resend forks a new direction from the version before that message and keeps the old chat', async () => {
    const { project, runs } = await fourMessages();
    const listed = await call<Version[]>('GET', `/api/projects/${project.id}/d/main/versions`);
    const third = runs[2] as RunSummary;
    const base = forkBaseOf(third, listed.data);
    expect(base).toBe(runs[1]?.versionId);

    const fork = await call<Direction>('POST', `/api/projects/${project.id}/directions`, { fromVersionId: base, name: 'Main edit' });
    expect(fork.status).toBe(200);
    const edited = await send(project.id, fork.data.id, 'Add weekend hours');
    expect(edited.directionId).toBe(fork.data.id);

    const after = await projects.get(project.id);
    expect(after.directions).toHaveLength(project.directions.length + 1);
    const all = (await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`)).data;
    expect(all.filter((summary) => summary.directionId === 'main')).toHaveLength(4);
    const html = await readFile(path.join(fork.data.workTree, 'index.html'), 'utf8');
    expect(html).toContain('Add a menu section');
    expect(html).toContain('Add weekend hours');
    expect(html).not.toContain('Add opening hours');
    const main = await readFile(path.join(projects.mainDirection(after).workTree, 'index.html'), 'utf8');
    expect(main).toContain('Add a contact form');
  });
});

describe('R7-7 run titles', { timeout: 60_000 }, () => {
  it('PATCH /api/runs/:runId stores a title that the run list returns, and checks the body', async () => {
    const created = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'x', kind: 'html', startRun: false });
    const pid = created.data.project.id;
    const summary = await send(pid, 'main', 'Harbor Lane Coffee');

    const renamed = await call<RunSummary>('PATCH', `/api/runs/${summary.id}`, { title: '  Hero pass  ' });
    expect(renamed.status).toBe(200);
    expect(renamed.data.title).toBe('Hero pass');
    expect((await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`)).data[0]?.title).toBe('Hero pass');

    expect((await call('PATCH', `/api/runs/${summary.id}`, { title: 'x'.repeat(81) })).status).toBe(400);
    expect((await call('PATCH', `/api/runs/${summary.id}`, { title: 'ok', extra: 1 })).status).toBe(400);
    expect((await call('PATCH', `/api/runs/${summary.id}`, 'not json')).status).toBe(400);
    expect((await call('PATCH', '/api/runs/nope', { title: 'a' })).status).toBe(404);

    const cleared = await call<RunSummary>('PATCH', `/api/runs/${summary.id}`, { title: '' });
    expect(cleared.data.title).toBeUndefined();
    expect(cleared.data.finalText).toBe(summary.finalText);
  });

  it('refuses a rename while the run is active', async () => {
    const created = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'x', kind: 'html', startRun: false });
    const started = await call<{ runId: string }>('POST', `/api/projects/${created.data.project.id}/d/main/runs`, { prompt: 'Add a note [slow]', mode: 'edit' });
    const pid = created.data.project.id;
    for (let i = 0; i < 200 && !(await call<{ summary: RunSummary | null }>('GET', `/api/runs/${started.data.runId}`)).data.summary; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    expect(runner.isRunning(pid, 'main')).toBe(true);
    expect((await call('PATCH', `/api/runs/${started.data.runId}`, { title: 'a' })).status).toBe(409);
    await finished(started.data.runId);
  });
});
