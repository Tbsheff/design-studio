import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, Version } from '../../shared/contracts.js';
import type { WorkspaceList } from '../../shared/folders.js';
import { createFakePreview } from '../agent/test-fakes.js';
import { createEventBus } from '../store/events.js';
import { createProjectStore, type StudioProjectStore } from '../store/projects.js';
import { makeTempConfig } from '../store/testConfig.js';
import { createVersionStore } from '../store/versions.js';
import type { AgentRunContext, AgentRunner, ServerConfig, VersionStore } from '../types.js';
import { createApp } from './app.js';

let config: ServerConfig;
let cleanup: () => Promise<void>;
let parent: string;
let started: AgentRunContext[];
let app: ReturnType<typeof createApp>;
let projects: StudioProjectStore;
let versions: VersionStore;

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
  config.projectsDir = path.join(path.dirname(config.dataDir), 'Design Studio');
  versions = createVersionStore(config);
  projects = createProjectStore(config, versions, {
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
    expect(workspaces.folders.filter((entry) => !entry.default).map((entry) => entry.path)).toEqual([parent]);
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

describe('the default projects folder', { timeout: 30000 }, () => {
  const createDefault = async (prompt: string): Promise<Project> => {
    const response = await call('POST', '/api/projects', { prompt, kind: 'html', startRun: false });
    expect(response.status).toBe(200);
    return ((await response.json()) as { project: Project }).project;
  };

  const listWorkspaces = async (): Promise<WorkspaceList> => (await (await call('GET', '/api/workspaces')).json()) as WorkspaceList;

  it('puts a project with no location in a readable, deduped subfolder of the default folder', async () => {
    expect(existsSync(config.projectsDir)).toBe(false);
    const before = await listWorkspaces();
    expect(before.folders).toEqual([{ id: 'default', path: config.projectsDir, label: 'Design Studio', addedAt: 0, missing: false, default: true }]);
    const first = await createDefault('Pricing page for a tool');
    const second = await createDefault('Pricing page for a tool');
    const root = realpathSync(config.projectsDir);
    expect(first.imported).toEqual({ sourcePath: path.join(root, 'pricing-page-for-a-tool'), created: true });
    expect(second.imported?.sourcePath).toBe(path.join(root, 'pricing-page-for-a-tool-2'));
    expect(projects.mainDirection(first).workTree).toBe(path.join(root, 'pricing-page-for-a-tool'));
    expect(existsSync(path.join(config.dataDir, 'projects', first.id, 'git'))).toBe(true);
    expect(existsSync(path.join(config.dataDir, 'projects', first.id, 'directions'))).toBe(false);
    const after = await listWorkspaces();
    expect(after.folders.map((folder) => folder.path)).toEqual([root]);
    expect((await call('DELETE', '/api/workspaces/default')).status).toBe(400);
    expect((await call('PATCH', '/api/workspaces/default', { label: 'Other' })).status).toBe(400);
  });

  it('changes the default folder through the endpoint and keeps the old one as a saved folder', async () => {
    await createDefault('First page');
    const oldRoot = realpathSync(config.projectsDir);
    for (const bad of ['relative/dir', path.join(parent, 'missing'), path.join(parent, 'sibling.txt'), config.dataDir]) {
      expect((await call('PUT', '/api/workspaces/default', { path: bad })).status, bad).toBe(400);
    }
    const response = await call('PUT', '/api/workspaces/default', { path: parent });
    expect(response.status).toBe(200);
    const list = (await response.json()) as WorkspaceList;
    expect(list.folders[0]).toMatchObject({ id: 'default', path: parent, default: true });
    expect(list.folders.slice(1).map((folder) => folder.path)).toEqual([oldRoot]);
    const saved = JSON.parse(readFileSync(path.join(config.dataDir, 'preferences.json'), 'utf8')) as { projectsDir: string };
    expect(saved.projectsDir).toBe(parent);
    const next = await createDefault('Second page');
    expect(next.imported?.sourcePath).toBe(path.join(parent, 'second-page'));
  });

  const hiddenProject = async (name: string, kind: 'html' | 'react' = 'html'): Promise<Project> => {
    const created = await projects.create({ name, kind });
    const main = projects.mainDirection(created);
    await writeFile(path.join(main.workTree, 'index.html'), `<h1>${name}</h1>\n`);
    await versions.ensureRepo(created);
    const version = await versions.commit(created, main, 'First', { kind: 'manual' });
    await projects.updateDirection(created.id, main.id, { headVersionId: version!.id, sessionId: 'old-session' });
    return projects.get(created.id);
  };

  it('moves hidden projects into the default folder only on request and keeps their versions', async () => {
    const html = await hiddenProject('Old landing');
    const react = await hiddenProject('Old app', 'react');
    const oldTree = projects.mainDirection(html).workTree;
    expect(((await (await call('GET', '/api/hidden-projects')).json()) as { count: number }).count).toBe(2);
    expect(existsSync(config.projectsDir)).toBe(false);
    const response = await call('POST', '/api/hidden-projects/move');
    const result = (await response.json()) as { moved: string[]; failed: unknown[] };
    expect(result.failed).toEqual([]);
    expect(result.moved.sort()).toEqual([html.id, react.id].sort());
    const root = realpathSync(config.projectsDir);
    const movedHtml = await projects.get(html.id);
    const main = projects.mainDirection(movedHtml);
    expect(main.workTree).toBe(path.join(root, 'old-landing'));
    expect(movedHtml.imported).toEqual({ sourcePath: main.workTree, created: true });
    expect(main.sessionId).toBeNull();
    expect(main.sessionResetReason).toBe('move');
    expect(main.headVersionId).toBe(projects.mainDirection(html).headVersionId);
    expect(readFileSync(path.join(main.workTree, 'index.html'), 'utf8')).toBe('<h1>Old landing</h1>\n');
    expect(existsSync(oldTree)).toBe(false);
    expect(await versions.status(movedHtml, main)).toEqual({ dirty: false, changed: [] });
    const history = (await (await call('GET', `/api/projects/${html.id}/d/main/versions`)).json()) as Version[];
    expect(history.map((version) => version.title)).toEqual(['First']);
    const reactMain = projects.mainDirection(await projects.get(react.id));
    expect(reactMain.workTree).toBe(path.join(root, 'old-app'));
    expect(lstatSync(path.join(reactMain.workTree, 'node_modules')).isSymbolicLink()).toBe(true);
    expect(((await (await call('GET', '/api/hidden-projects')).json()) as { count: number }).count).toBe(0);
  });

  it('leaves a project as it was when the move fails partway', async () => {
    const project = await hiddenProject('Locked page');
    const main = projects.mainDirection(project);
    await mkdir(path.join(main.workTree, 'assets'));
    await writeFile(path.join(main.workTree, 'assets', 'a.txt'), 'a\n');
    await symlink('a.txt', path.join(main.workTree, 'assets', 'link.txt'));
    const locked = path.join(main.workTree, 'assets', 'secret.txt');
    await writeFile(locked, 'secret\n');
    await chmod(locked, 0o000);
    const projectFile = path.join(config.dataDir, 'projects', project.id, 'project.json');
    const before = readFileSync(projectFile, 'utf8');
    try {
      const result = (await (await call('POST', '/api/hidden-projects/move')).json()) as { moved: string[]; failed: { projectId: string; error: string }[] };
      expect(result.moved).toEqual([]);
      expect(result.failed.map((entry) => entry.projectId)).toEqual([project.id]);
      expect(result.failed[0]?.error).toMatch(/EACCES/);
    } finally {
      await chmod(locked, 0o644);
    }
    expect(readFileSync(projectFile, 'utf8')).toBe(before);
    expect(readdirSync(config.projectsDir)).toEqual([]);
    expect(readFileSync(path.join(main.workTree, 'index.html'), 'utf8')).toBe('<h1>Locked page</h1>\n');
    expect(readFileSync(locked, 'utf8')).toBe('secret\n');
    expect(readlinkSync(path.join(main.workTree, 'assets', 'link.txt'))).toBe('a.txt');
    expect(((await (await call('GET', '/api/hidden-projects')).json()) as { count: number }).count).toBe(1);
  });
});
