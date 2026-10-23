import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, RunSentRecord, RunSummary, VariationBrief, VariationStartResult } from '../../shared/contracts.js';
import { createRunLifecycle, EMPTY_USAGE, type DriverInput, type DriverOutcome } from '../agent/lifecycle.js';
import { createMockDriver } from '../agent/mock.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createApp } from '../http/app.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig, VersionStore } from '../types.js';
import { fanOut, variationName } from './fanout.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let versions: VersionStore;
let runner: AgentRunner;
let app: ReturnType<typeof createApp>;
let driverMode: 'fail-b' | 'wait' | 'mock';

const BRIEFS = [
  { title: 'Workshop ledger', brief: 'Left rail of services with prices, big serif headline, cream paper and oxblood accent.' },
  { title: 'Street poster', brief: 'Full-bleed yellow and black bands, condensed caps, oversized hours, loud and dense.' },
  { title: 'Calm booking', brief: 'Booking form first in a white card, small grotesk, slate gray with a teal action color.' },
];

function outcome(status: DriverOutcome['status'], error: string | null = null): DriverOutcome {
  return { status, usage: { ...EMPTY_USAGE }, costUsd: 0.01, durationMs: 1, modelMs: 1, finalText: 'done', error };
}

async function testDriver(input: DriverInput): Promise<DriverOutcome> {
  if (driverMode === 'mock') return createMockDriver()(input);
  const variation = input.ctx.request.variation;
  if (driverMode === 'wait' && variation) {
    await new Promise<void>((resolve) => input.signal.addEventListener('abort', () => resolve(), { once: true }));
    return outcome('failed', 'aborted');
  }
  if (variation?.label === 'B') throw new Error('model exploded');
  await new Promise((resolve) => setTimeout(resolve, 30));
  await writeFile(path.join(input.ctx.direction.workTree, 'index.html'), `<h1>${variation?.title ?? 'base'}</h1>\n`);
  return outcome('completed');
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function createProject(kind: 'html' | 'react' = 'html'): Promise<Project> {
  const response = await call('POST', '/api/projects', { prompt: 'Bike repair shop', kind, settings: { maxBudgetUsd: 0.2 } });
  expect(response.status).toBe(200);
  const { project, runId } = (await response.json()) as { project: Project; runId: string };
  await runner.get(runId)?.done;
  return projects.get(project.id);
}

async function start(project: Project, briefs: unknown[] = BRIEFS): Promise<VariationStartResult> {
  const response = await call('POST', `/api/projects/${project.id}/variations`, { prompt: 'Bike repair shop', briefs, fromDirectionId: 'main', level: 'wireframe' });
  expect(response.status).toBe(200);
  return (await response.json()) as VariationStartResult;
}

async function settle(result: VariationStartResult): Promise<RunSummary[]> {
  return Promise.all(result.items.map(async (item) => (item.runId ? ((await runner.get(item.runId)?.done) as RunSummary) : (null as never))));
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  const bus = createEventBus(config.dataDir);
  runner = createRunLifecycle({ bus, projects, versions }, testDriver);
  driverMode = 'fail-b';
  app = createApp({ config, bus, projects, versions, runner, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
});

describe('variations fan-out', { timeout: 30000 }, () => {
  it('creates N directions from the head and starts N runs at the same time', async () => {
    const project = await createProject();
    const head = project.directions[0]?.headVersionId;
    driverMode = 'mock';
    const result = await start(project);
    expect(result.items.map((item) => item.label)).toEqual(['A', 'B', 'C']);
    expect(result.items.every((item) => item.runId && item.directionId && !item.error)).toBe(true);
    expect(result.perRunBudgetUsd).toBe(0.2);
    expect(result.totalBudgetUsd).toBe(0.6);
    const running = result.items.filter((item) => item.directionId && runner.isRunning(project.id, item.directionId));
    expect(running).toHaveLength(3);
    const summaries = await settle(result);
    expect(summaries.map((summary) => summary.status)).toEqual(['completed', 'completed', 'completed']);
    const latest = await projects.get(project.id);
    const group = latest.directions.filter((direction) => direction.variation?.groupId === result.groupId);
    expect(group.map((direction) => direction.name)).toEqual(['Variation A', 'Variation B', 'Variation C']);
    expect(group.every((direction) => direction.parentVersionId === head)).toBe(true);
    const pages = await Promise.all(group.map((direction) => readFile(path.join(direction.workTree, 'index.html'), 'utf8')));
    expect(new Set(pages.map((page) => /data-variation="(\w)"/.exec(page)?.[1]))).toEqual(new Set(['A', 'B', 'C']));
    expect(new Set(pages.map((page) => /class="variation-(\w+)"/.exec(page)?.[1])).size).toBe(3);
    for (const direction of group) {
      const list = await versions.list(latest, direction);
      expect(list.filter((version) => version.meta.kind === 'run')).toHaveLength(1);
    }
    const sentText = await readFile(path.join(projects.projectDir(project.id), 'runs', `${result.items[1]?.runId}.jsonl`), 'utf8');
    const sent = sentText.trim().split('\n').map((line) => JSON.parse(line) as RunSentRecord).filter((line) => line.type === 'run.sent');
    expect(sent[0]?.text).toContain('<variation label="B" index="1" of="3">');
  });

  it('keeps the other runs going when one run fails', async () => {
    const project = await createProject();
    const result = await start(project);
    const summaries = await settle(result);
    expect(summaries.map((summary) => summary.status)).toEqual(['completed', 'failed', 'completed']);
    expect(summaries[1]?.error).toBe('model exploded');
    expect(summaries[0]?.versionId).toBeTruthy();
    expect(summaries[2]?.versionId).toBeTruthy();
  });

  it('cancels every run of the group with cancel-all', async () => {
    const project = await createProject();
    driverMode = 'wait';
    const result = await start(project);
    const response = await call('POST', `/api/projects/${project.id}/variations/${result.groupId}/cancel`);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { canceled: string[] }).canceled).toHaveLength(3);
    const summaries = await settle(result);
    expect(summaries.map((summary) => summary.status)).toEqual(['canceled', 'canceled', 'canceled']);
  });

  it('rejects bad counts and briefs', async () => {
    const project = await createProject();
    const one = await call('POST', `/api/projects/${project.id}/variations`, { prompt: 'x', briefs: BRIEFS.slice(0, 1) });
    expect(one.status).toBe(400);
    const briefs = await call('POST', `/api/projects/${project.id}/variations/briefs`, { prompt: 'x', count: 5 });
    expect(briefs.status).toBe(400);
    const ok = await call('POST', `/api/projects/${project.id}/variations/briefs`, { prompt: 'bike shop', count: 3, fromDirectionId: 'main' });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { briefs: VariationBrief[]; source: string }).source).toBe('mock');
    const defaulted = await call('POST', `/api/projects/${project.id}/variations/briefs`, { prompt: 'bike shop' });
    expect(((await defaulted.json()) as { briefs: VariationBrief[] }).briefs).toHaveLength(3);
  });

  it('caps React projects at 3 variations', async () => {
    const project = await createProject('react');
    const four = [...BRIEFS, { title: 'Photo dark', brief: 'Dark canvas with framed photos, condensed uppercase headings, neon lime accent.' }];
    const response = await call('POST', `/api/projects/${project.id}/variations`, { prompt: 'x', briefs: four });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toMatch(/React/);
  }, 120000);

  it('mixes an element from B into A as a reference, not a selection', async () => {
    const project = await createProject();
    driverMode = 'mock';
    const result = await start(project);
    await settle(result);
    const [a, b] = result.items;
    const latest = await projects.get(project.id);
    const directionB = latest.directions.find((direction) => direction.id === b?.directionId);
    const pageB = await readFile(path.join(directionB!.workTree, 'index.html'), 'utf8');
    const asideLine = pageB.split('\n').findIndex((line) => line.includes('<aside')) + 1;
    const element = { selector: 'aside', tag: 'aside', text: 'Option B', outerHTML: '<aside aria-label="Details">Option B</aside>', styles: { 'background-color': 'rgb(228, 0, 43)' }, rect: { x: 0, y: 0, width: 10, height: 10 }, source: { file: 'index.html', line: asideLine, col: 5 }, ancestors: ['main'] };
    const response = await call('POST', `/api/projects/${project.id}/variations/mix`, { fromDirectionId: b?.directionId, toDirectionId: a?.directionId, element });
    expect(response.status).toBe(200);
    const { runId } = (await response.json()) as { runId: string };
    const summary = (await runner.get(runId)?.done) as RunSummary;
    expect(summary.status).toBe('completed');
    expect(summary.request.selection).toBeUndefined();
    expect(summary.request.reference).toMatchObject({ fromDirectionId: directionB?.id, fromLabel: 'Variation B', tag: 'aside' });
    const lines = (await readFile(path.join(projects.projectDir(project.id), 'runs', `${runId}.jsonl`), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as RunSentRecord);
    const sent = lines.find((line) => line.type === 'run.sent');
    expect(sent?.text).toContain('<reference-element from="Variation B">');
    expect(sent?.text).toContain('<aside aria-label="Details">Option B</aside>');
    expect(sent?.text).toContain('source snippet:\n<aside aria-label="Details"><h2>Option B</h2>');
    const pageA = await readFile(path.join(latest.directions.find((direction) => direction.id === a?.directionId)!.workTree, 'index.html'), 'utf8');
    expect(pageA).toContain('class="mock-mix" data-from="Variation B"');
  });
});

describe('fanOut', () => {
  it('names around taken names and reports a start failure on its item only', async () => {
    expect(variationName('A', new Set(['Variation A']))).toBe('Variation A (2)');
    let made = 0;
    const items = await fanOut(
      {
        createDirection: async (name, variation) => {
          made += 1;
          if (variation.label === 'C') throw new Error('disk full');
          return { id: `d${made}`, name, workTree: '/tmp/x', branch: 'b', headVersionId: null, parentVersionId: null, sessionId: null, createdAt: 0, variation };
        },
        startRun: async (direction) => {
          if (direction.variation?.label === 'A') throw new Error('busy');
          return `run-${direction.id}`;
        },
      },
      { groupId: 'g1', prompt: 'p', briefs: BRIEFS.map((brief, index) => ({ ...brief, label: 'ABC'[index]! })), level: 'prototype', takenNames: new Set() },
    );
    expect(items).toEqual([
      { label: 'A', directionId: 'd1', runId: null, error: 'Could not start the run: busy' },
      { label: 'B', directionId: 'd2', runId: 'run-d2', error: null },
      { label: 'C', directionId: null, runId: null, error: 'Could not create the direction: disk full' },
    ]);
  });
});
