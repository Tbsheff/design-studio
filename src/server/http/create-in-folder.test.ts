import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, Version } from '../../shared/contracts.js';
import type { WorkspaceList } from '../../shared/folders.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunContext, AgentRunner, ServerConfig } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let parent: string;
let started: AgentRunContext[];
let app: ReturnType<typeof createApp>;

function listTree(root: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    out.push(relative);
    if (entry.isDirectory() && !entry.isSymbolicLink()) out.push(...listTree(root, relative));
  }
  return out.sort();
}

function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const relative of listTree(root)) {
    const full = path.join(root, relative);
    const info = lstatSync(full);
    files[relative] = info.isSymbolicLink() ? 'link' : info.isDirectory() ? 'dir' : readFileSync(full, 'utf8');
  }
  return files;
}

function call(method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'x-studio-token': config.studioToken, 'content-type': 'application/json' };
  return Promise.resolve(app.request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

async function createIn(body: Record<string, unknown>): Promise<{ response: Response; project: Project | null }> {
  const response = await call('POST', '/api/projects', { prompt: 'Pricing page', kind: 'html', startRun: false, parentPath: parent, ...body });
  const json = (await response.json()) as { project?: Project };
  return { response, project: json.project ?? null };
}

beforeEach(async () => {
  ({ config, cleanup } = await makeTempConfig());
  config.dataDir = realpathSync(config.dataDir);
  parent = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'studio parent ')));
  await writeFile(path.join(parent, 'sibling.txt'), 'sibling\n');
  await mkdir(path.join(parent, 'notes'));
  await writeFile(path.join(parent, 'notes', 'todo.md'), 'todo\n');
  const versions = createVersionStore(config);
  const projects = createProjectStore(config, versions, {
    installTemplateDeps: async (cacheDir) => {
      await mkdir(path.join(cacheDir, 'node_modules', 'react'), { recursive: true });
    },
  });
  started = [];
  const runner: AgentRunner = {
    start(ctx) {
      started.push(ctx);
      return { runId: `run${started.length}`, cancel: () => undefined, done: new Promise(() => undefined) };
    },
    get: () => undefined,
    isRunning: () => false,
  };
  app = createApp({ config, bus: createEventBus(config.dataDir), projects, versions, runner, preview: { ...createFakePreview(), directionUrl: async () => 'http://127.0.0.1:0/' } });
});

afterEach(async () => {
  await cleanup();
  await rm(parent, { recursive: true, force: true });
});

describe('create a project in a chosen folder', { timeout: 30000 }, () => {
  it('writes only a new subfolder and keeps the shadow git in the data dir', async () => {
    const before = snapshot(parent);
    const { response, project } = await createIn({ startRun: true, designMd: '# Notes\n' });
    expect(response.status).toBe(200);
    const folder = path.join(parent, 'pricing-page');
    expect(project?.imported).toEqual({ sourcePath: folder, created: true });
    expect(project?.name).toBe('Pricing page');
    expect(project?.directions[0]?.workTree).toBe(folder);
    const after = snapshot(parent);
    const outsideNew = Object.fromEntries(Object.entries(after).filter(([relative]) => relative !== 'pricing-page' && !relative.startsWith(`pricing-page${path.sep}`)));
    expect(outsideNew).toEqual(before);
    expect(listTree(folder)).toEqual(['DESIGN.md']);
    expect(existsSync(path.join(folder, '.git'))).toBe(false);
    expect(statSync(path.join(config.dataDir, 'projects', project!.id, 'git')).isDirectory()).toBe(true);
    expect(started[0]?.direction.workTree).toBe(folder);
    const workspaces = (await (await call('GET', '/api/workspaces')).json()) as WorkspaceList;
    expect(workspaces.folders.map((entry) => entry.path)).toEqual([parent]);
  });

  it('copies the React template into the new subfolder and starts with a Starter template version', async () => {
    const { response, project } = await createIn({ kind: 'react', prompt: 'Dashboard' });
    expect(response.status).toBe(200);
    const folder = path.join(parent, 'dashboard');
    expect(existsSync(path.join(folder, 'package.json'))).toBe(true);
    expect(lstatSync(path.join(folder, 'node_modules')).isSymbolicLink()).toBe(true);
    expect(realpathSync(path.join(folder, 'node_modules')).startsWith(config.dataDir + path.sep)).toBe(true);
    const versions = (await (await call('GET', `/api/projects/${project!.id}/d/main/versions`)).json()) as Version[];
    expect(versions.map((version) => version.title)).toEqual(['Starter template']);
  });

  it('never writes into an existing folder: picks -2, -3 instead', async () => {
    await mkdir(path.join(parent, 'pricing-page'));
    await writeFile(path.join(parent, 'pricing-page', 'user.txt'), 'mine\n');
    await mkdir(path.join(parent, 'pricing-page-2'));
    const { project } = await createIn({});
    expect(project?.imported?.sourcePath).toBe(path.join(parent, 'pricing-page-3'));
    expect(readdirSync(path.join(parent, 'pricing-page'))).toEqual(['user.txt']);
    expect(readdirSync(path.join(parent, 'pricing-page-2'))).toEqual([]);
    const second = await createIn({});
    expect(second.project?.imported?.sourcePath).toBe(path.join(parent, 'pricing-page-4'));
  });

  it('refuses bad parents and leaves nothing behind', async () => {
    const before = snapshot(parent);
    for (const parentPath of ['relative/dir', path.join(parent, 'missing'), path.join(parent, 'sibling.txt'), config.dataDir, path.join(config.dataDir, 'projects')]) {
      await mkdir(path.join(config.dataDir, 'projects'), { recursive: true });
      const { response } = await createIn({ parentPath });
      expect(response.status, parentPath).toBe(400);
    }
    expect((await createIn({ parentPath: 7 })).response.status).toBe(400);
    expect(snapshot(parent)).toEqual(before);
    expect(readdirSync(path.join(config.dataDir, 'projects'))).toEqual([]);
  });

  it('keeps a name with path parts inside the parent', async () => {
    const { project } = await createIn({ name: '../../escape/../me' });
    expect(path.dirname(project!.imported!.sourcePath)).toBe(parent);
    expect(path.basename(project!.imported!.sourcePath)).toBe('escape-me');
  });
});
