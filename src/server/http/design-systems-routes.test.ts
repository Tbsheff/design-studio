import { existsSync, realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DesignSystemDraftInfo, DesignSystemDraftResult, PackSummary, Project, SavePackResult, Version } from '../../shared/contracts.js';
import { PACK_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { normalizeColor } from '../design-system/extract/values.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'design-system', 'extract', '__fixtures__');

let site: http.Server;
let siteUrl: string;
let config: ServerConfig;
let cleanup: () => Promise<void>;
let app: ReturnType<typeof createApp>;

const runner: AgentRunner = {
  start: () => ({ runId: 'run', cancel: () => undefined, done: new Promise(() => undefined) }),
  get: () => undefined,
  isRunning: () => false,
};

function makeApp(allowLoopback: boolean): ReturnType<typeof createApp> {
  const versions = createVersionStore(config);
  const projects = createProjectStore(config, versions);
  return createApp({ config: { ...config, fetchAllowLoopback: allowLoopback }, bus: createEventBus(config.dataDir), projects, versions, runner, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken };
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const payload = body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);
  return Promise.resolve(app.request(url, { method, headers, body: payload }));
}

async function ok<T>(response: Promise<Response>): Promise<T> {
  const res = await response;
  const text = await res.text();
  expect(res.status, text).toBe(200);
  return JSON.parse(text) as T;
}

async function errorOf(response: Promise<Response>): Promise<{ status: number; error: string }> {
  const res = await response;
  return { status: res.status, error: ((await res.json()) as { error: string }).error };
}

const workTree = (project: Project) => project.directions[0]!.workTree;
const userPacks = async () => (await ok<PackSummary[]>(call('GET', '/api/packs'))).filter((pack) => pack.source === 'user');

beforeAll(async () => {
  site = http.createServer((req, res) => {
    const name = path.basename((req.url ?? '/') === '/' ? 'index.html' : (req.url ?? ''));
    readFile(path.join(FIXTURES, 'site', name))
      .then((body) => res.writeHead(200, { 'content-type': name.endsWith('.css') ? 'text/css' : 'text/html' }).end(body))
      .catch(() => res.writeHead(404).end());
  });
  await new Promise<void>((resolve) => site.listen(0, '127.0.0.1', resolve));
  siteUrl = `http://127.0.0.1:${(site.address() as AddressInfo).port}/`;
});

afterAll(async () => {
  await new Promise((resolve) => site.close(resolve));
});

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  app = makeApp(true);
});

afterEach(async () => {
  await cleanup();
});

describe('POST /api/design-systems/draft', { timeout: 30000 }, () => {
  it('creates a draft pack and a backing HTML project from a DTCG file in one version, under 5 s', async () => {
    const text = await readFile(path.join(FIXTURES, 'dtcg.tokens.json'), 'utf8');
    const result = await ok<DesignSystemDraftResult>(call('POST', '/api/design-systems/draft', { tokensFile: { name: 'Evergreen.tokens.json', text } }));
    expect(result.ms).toBeLessThan(5000);
    expect(result.pack).toMatchObject({ id: 'user-evergreen', name: 'Evergreen', source: 'user', provenance: 'imported' });
    expect(result.project).toMatchObject({ name: 'Evergreen design system', kind: 'html', designSystemFor: 'user-evergreen', packId: 'user-evergreen' });
    const tree = workTree(result.project);
    expect(tree.startsWith(realpathSync(config.projectsDir))).toBe(true);
    for (const file of ['index.html', 'source/meta.json', 'source/coverage.json', 'source/evidence.md', 'source/tokens-file.json.txt', TOKENS_FILE, PACK_FILE, 'design-system/tokens.css', 'DESIGN.md']) {
      expect(existsSync(path.join(tree, file)), file).toBe(true);
    }
    const css = await readFile(path.join(tree, 'design-system/tokens.css'), 'utf8');
    expect(css).toContain('--primary:');
    const versions = await ok<Version[]>(call('GET', `/api/projects/${result.project.id}/d/main/versions`));
    expect(versions.map((version) => version.title)).toEqual(['Apply Evergreen design system']);
    expect(versions[0]?.changedFiles).toEqual(expect.arrayContaining(['index.html', 'source/coverage.json', 'design-system/tokens.json']));
    expect(await ok<{ dirty: boolean }>(call('GET', `/api/projects/${result.project.id}/d/main/status`))).toMatchObject({ dirty: false });
    const info = await ok<DesignSystemDraftInfo>(call('GET', `/api/projects/${result.project.id}/design-system-draft`));
    expect(info.packId).toBe('user-evergreen');
    expect(info.coverage?.tokens.find((entry) => entry.token === 'color.primary')).toMatchObject({ source: 'tokens-file', confidence: 'high' });
    const meta = JSON.parse(await readFile(path.join(tree, 'source/meta.json'), 'utf8')) as { packId: string; inputs: { tokensFile: string } };
    expect(meta).toMatchObject({ packId: 'user-evergreen', inputs: { tokensFile: 'Evergreen.tokens.json' } });
  });

  it('takes multipart: a URL, pasted DESIGN.md, a tokens file upload and images', async () => {
    const form = new FormData();
    form.append('request', JSON.stringify({ urls: [siteUrl], designMd: '# Rockets\n\nBold and loud.\n', name: 'Rocket Kit' }));
    form.append('tokensFile', new File([await readFile(path.join(FIXTURES, 'tokens-studio.json'))], 'studio.json', { type: 'application/json' }));
    form.append('images', new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' }));
    const result = await ok<DesignSystemDraftResult>(call('POST', '/api/design-systems/draft', form));
    expect(result.pack).toMatchObject({ id: 'user-rocket-kit', provenance: 'extracted' });
    const tree = workTree(result.project);
    const meta = JSON.parse(await readFile(path.join(tree, 'source/meta.json'), 'utf8')) as { attachments: Array<{ id: string; name: string }> };
    expect(meta.attachments).toHaveLength(1);
    expect(meta.attachments[0]?.name).toBe('logo.png');
    expect(existsSync(path.join(tree, 'source/url-1/page.html.txt'))).toBe(true);
    const tokens = JSON.parse(await readFile(path.join(tree, TOKENS_FILE), 'utf8')) as { color: Record<string, { $value: string }> };
    expect(tokens.color.primary?.$value).toBe(normalizeColor('#2563eb'));
    expect(tokens.color.accent?.$value).toBe(normalizeColor('#e8590c'));
    expect(await readFile(path.join(tree, 'DESIGN.md'), 'utf8')).toContain('Bold and loud.');
  });

  it('refuses private and loopback URLs without the test allow, and leaves nothing behind', async () => {
    app = makeApp(false);
    for (const url of [siteUrl, 'http://localhost:4170/', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.1/', 'file:///etc/passwd']) {
      const response = await errorOf(call('POST', '/api/design-systems/draft', { urls: [url] }));
      expect(response.status, url).toBe(400);
      expect(response.error).toMatch(/Cannot read/);
    }
    expect(await userPacks()).toEqual([]);
    expect(await ok<Project[]>(call('GET', '/api/projects'))).toEqual([]);
  });

  it('needs a source and checks uploads', async () => {
    expect((await errorOf(call('POST', '/api/design-systems/draft', {}))).error).toMatch(/at least one source/);
    expect((await call('POST', '/api/design-systems/draft', { urls: ['a', 'b', 'c', 'd'] })).status).toBe(400);
    expect((await call('POST', '/api/design-systems/draft', { brief: 'x', basePackId: 'nope' })).status).toBe(400);
    const svg = new FormData();
    svg.append('request', JSON.stringify({ brief: 'logo only' }));
    svg.append('images', new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect((await errorOf(call('POST', '/api/design-systems/draft', svg))).error).toMatch(/PNG, JPEG, GIF or WebP/);
    expect(await userPacks()).toEqual([]);
  });

  it('save to library from the backing project updates the same draft pack', async () => {
    const result = await ok<DesignSystemDraftResult>(call('POST', '/api/design-systems/draft', { brief: 'Quiet tools', urls: [siteUrl] }));
    const tree = workTree(result.project);
    const tokens = JSON.parse(await readFile(path.join(tree, TOKENS_FILE), 'utf8')) as { color: Record<string, { $value: string }> };
    tokens.color.primary!.$value = 'oklch(50% 0.2 20)';
    await writeFile(path.join(tree, TOKENS_FILE), `${JSON.stringify(tokens, null, 2)}\n`);
    const saved = await ok<SavePackResult>(call('POST', `/api/projects/${result.project.id}/d/main/design-system/save`, { name: result.pack.name, packId: result.pack.id }));
    expect(saved).toMatchObject({ created: false, pack: { id: result.pack.id }, version: null });
    expect((await userPacks()).map((pack) => pack.id)).toEqual([result.pack.id]);
    const detail = await ok<{ tokensJson: string }>(call('GET', `/api/packs/${result.pack.id}`));
    expect(detail.tokensJson).toContain('oklch(50% 0.2 20)');
    const again = await ok<SavePackResult>(call('POST', `/api/projects/${result.project.id}/d/main/design-system/save`, { name: result.pack.name }));
    expect(again).toMatchObject({ created: false, pack: { id: result.pack.id } });
  });

  it('answers 404 for the draft info of a normal project', async () => {
    const { project } = await ok<{ project: Project }>(call('POST', '/api/projects', { prompt: 'Plain', kind: 'html', startRun: false }));
    expect((await call('GET', `/api/projects/${project.id}/design-system-draft`)).status).toBe(404);
  });
});
