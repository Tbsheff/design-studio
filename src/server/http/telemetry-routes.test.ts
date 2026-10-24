import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, TelemetrySample } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let projects: StudioProjectStore;
let app: ReturnType<typeof createApp>;

const runner: AgentRunner = {
  start: () => ({ runId: 'r1', cancel: () => undefined, done: new Promise(() => undefined) }),
  get: () => undefined,
  isRunning: () => false,
};

async function call<T>(method: string, url: string, body?: unknown, expected = 200): Promise<T> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  expect(response.status, await response.clone().text()).toBe(expected);
  return (await response.json()) as T;
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  const versions = createVersionStore(config);
  projects = createProjectStore(config, versions);
  app = createApp({ config, bus: createEventBus(config.dataDir), projects, versions, runner, preview: createFakePreview() });
});

afterEach(async () => {
  await cleanup();
});

describe('telemetry routes', { timeout: 30000 }, () => {
  it('keeps app samples without a project apart from project samples', async () => {
    const { project } = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'A page', kind: 'html', startRun: false });
    await call('POST', '/api/telemetry', { kind: 'app.start', ms: 120, ts: 1, detail: { surface: 'web', screen: 'home' } });
    await call('POST', '/api/telemetry', { kind: 'frame.long', ms: 80, ts: 2, detail: { count: 1 } });
    await call('POST', '/api/telemetry', { kind: 'edit.commit', projectId: project.id, directionId: 'main', ms: 12, ts: 3, detail: { kind: 'style', count: 1 } });
    await call('POST', '/api/telemetry', { kind: 'run.first_token', projectId: project.id, ms: 40, ts: 4, detail: { runId: 'r1', stage: 'visible' } });

    const appOnly = await call<TelemetrySample[]>('GET', '/api/telemetry?scope=app');
    expect(appOnly.map((sample) => sample.kind)).toEqual(['app.start', 'frame.long']);
    expect(appOnly[0]).not.toHaveProperty('projectId');
    const ofProject = await call<TelemetrySample[]>('GET', `/api/telemetry?projectId=${project.id}`);
    expect(ofProject.map((sample) => sample.kind)).toEqual(['edit.commit', 'run.first_token']);
    const all = await call<TelemetrySample[]>('GET', '/api/telemetry');
    expect(all.map((sample) => sample.ts)).toEqual([1, 2, 3, 4]);
  });

  it('needs a project for project kinds and rejects unknown kinds and unknown projects', async () => {
    await call('POST', '/api/telemetry', { kind: 'edit.commit', ms: 5 }, 400);
    await call('POST', '/api/telemetry', { kind: 'nope', ms: 5 }, 400);
    await call('POST', '/api/telemetry', { kind: 'frame.long', projectId: 'missing', ms: 5 }, 404);
    await call('POST', '/api/telemetry', { kind: 'app.start', ms: 'fast' }, 400);
  });
});
