import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type ElectronApplication, type Frame, type Page } from '@playwright/test';
import type { Project, RenderCheckResult, RunSummary, Version } from '../src/shared/contracts';
import { alive, groupMembers, listProcesses, processCommandAndEnv, processEnvKeys, type ProcessRow } from './support/processes';
import { APP_BINARY, desktopEnv, launchDesktop, SERVER_MARKER } from './support/desktop-app';

test.describe.configure({ mode: 'serial' });

const LEAKY_ENV = /^(CLAUDE_CODE_|ANTHROPIC_BASE_URL$)/;

let app: ElectronApplication;
let page: Page;
let token = '';
let origin = '';
let dataDir = '';
let closed = false;

function launchEnv(work: string): Record<string, string> {
  return desktopEnv(work, { CLAUDE_CODE_P0_CANARY: '1', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9/canary' });
}

async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(`${origin}${route}`, {
    method,
    headers: { 'x-studio-token': token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function finishedRuns(pid: string): Promise<number> {
  const runs = await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`);
  return runs.filter((run) => run.status !== 'running').length;
}

async function goHome(): Promise<void> {
  await page.goto(`${origin}/`);
  await page.evaluate(() => localStorage.removeItem('design-studio.ui.v1'));
  await page.goto(`${origin}/`);
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
}

async function createProject(prompt: string, kind: 'html' | 'react'): Promise<Project> {
  await goHome();
  const before = new Set((await call<Project[]>('GET', '/api/projects')).map((project) => project.id));
  await page.getByLabel('Describe the design').fill(prompt);
  await page.getByRole('radio', { name: kind === 'html' ? 'HTML' : 'React + Vite' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  const created = (await call<Project[]>('GET', '/api/projects')).find((project) => !before.has(project.id));
  if (!created) throw new Error('created project not found');
  return created;
}

function frontH1() {
  return page.frameLocator('iframe.frame.front').locator('h1');
}

async function frameAt(prefix: string): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => frame.url().startsWith(prefix))).toBe(true);
  const frame = page.frames().find((candidate) => candidate.url().startsWith(prefix));
  if (!frame) throw new Error(`no frame at ${prefix}`);
  return frame;
}

function serverProcess(): ProcessRow {
  const mainPid = app.process().pid;
  const row = listProcesses().find((candidate) => candidate.ppid === mainPid && candidate.command.includes(SERVER_MARKER));
  if (!row) throw new Error('server child not found');
  return row;
}

test.beforeAll(async () => {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio desktop ')));
  dataDir = path.join(work, 'data');
  app = await launchDesktop(launchEnv(work));
  page = await app.firstWindow({ timeout: 120_000 });
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible({ timeout: 60_000 });
  origin = new URL(page.url()).origin;
  token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
});

test.afterAll(async () => {
  if (app && !closed) await app.close();
});

test('window loads the studio with a locked-down renderer', async () => {
  expect(origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(app.windows()).toHaveLength(1);
  const renderer = await page.evaluate(() => ({
    hasRequire: typeof (globalThis as { require?: unknown }).require !== 'undefined',
    desktop: (window as unknown as { studioDesktop?: { version: string; platform: string } }).studioDesktop,
  }));
  expect(renderer.hasRequire).toBe(false);
  expect(renderer.desktop).toEqual({ version: '0.1.0', platform: process.platform });
  expect(await call<Project[]>('GET', '/api/projects')).toEqual([]);
});

test('external links open in the default browser, not in the app', async () => {
  await app.evaluate(({ shell }) => {
    const opened: string[] = [];
    (globalThis as { __opened?: string[] }).__opened = opened;
    shell.openExternal = async (url: string) => {
      opened.push(url);
    };
  });
  await page.evaluate(() => window.open('https://example.com/from-window-open'));
  await page.evaluate(() => {
    window.location.href = 'https://example.com/from-navigation';
  });
  await expect
    .poll(() => app.evaluate(() => (globalThis as { __opened?: string[] }).__opened ?? []))
    .toEqual(['https://example.com/from-window-open', 'https://example.com/from-navigation']);
  expect(new URL(page.url()).origin).toBe(origin);
  expect(app.windows()).toHaveLength(1);
});

test('server child runs on Electron Node with an allowlisted env', async () => {
  const server = serverProcess();
  expect(server.command).toContain(APP_BINARY);
  expect(server.pgid).toBe(server.pid);
  const keys = processEnvKeys(server.pid);
  expect(keys).toContain('ELECTRON_RUN_AS_NODE');
  expect(keys.filter((key) => LEAKY_ENV.test(key))).toEqual([]);
  expect(processCommandAndEnv(server.pid)).toContain(` STUDIO_DATA_DIR=${dataDir} `);
});

test('HTML project previews and a mock run makes a version', async () => {
  const project = await createProject('Desktop html check', 'html');
  await expect(frontH1()).toHaveText('Desktop html check', { timeout: 60_000 });
  await expect.poll(() => finishedRuns(project.id)).toBe(1);
  const main = project.directions[0];
  if (!main) throw new Error('project has no direction');
  await page.getByPlaceholder('Describe a change').fill('Make the headline calmer');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => finishedRuns(project.id)).toBe(2);
  const versions = await call<Version[]>('GET', `/api/projects/${project.id}/d/${main.id}/versions`);
  expect(versions.length).toBeGreaterThanOrEqual(2);
});

test('render_check in the app uses the Electron render pool, not Chrome', async () => {
  const projects = await call<Project[]>('GET', '/api/projects');
  const project = projects.find((item) => item.name.includes('Desktop html check')) ?? projects[0];
  const main = project?.directions[0];
  if (!project || !main) throw new Error('no project to check');
  const results = await call<RenderCheckResult[]>('POST', `/api/projects/${project.id}/d/${main.id}/check`);
  expect(results.length).toBeGreaterThan(0);
  expect(results.map((result) => result.backend)).toEqual(results.map(() => 'electron'));
  const server = serverProcess();
  expect(groupMembers(server.pgid).filter((row) => /Google Chrome|chrome-headless|ms-playwright/.test(row.command))).toEqual([]);
  const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => ({ visible: window.isVisible(), url: window.webContents.getURL() })));
  expect(windows.filter((window) => window.visible)).toHaveLength(1);
  expect(windows.filter((window) => !window.visible).every((window) => !window.url.startsWith(origin))).toBe(true);
});

test('React project hot-reloads a disk edit and Vite runs as Node', async () => {
  const project = await createProject('Desktop react check', 'react');
  await expect(frontH1()).toHaveText('Desktop react check', { timeout: 180_000 });
  const main = project.directions[0];
  if (!main) throw new Error('project has no direction');
  const previewUrl = (await call<{ url: string }>('GET', `/api/projects/${project.id}/d/${main.id}/preview`)).url;
  const vite = await frameAt(new URL(previewUrl).origin);
  await vite.evaluate(() => {
    (window as unknown as { __marker?: number }).__marker = 1;
  });
  expect(existsSync(path.join(dataDir, 'cache', 'react-template', '.studio-installed'))).toBe(true);
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  writeFileSync(appFile, readFileSync(appFile, 'utf8').replace('<h1>Desktop react check</h1>', '<h1>Edited on disk</h1>'));
  await expect(frontH1()).toHaveText('Edited on disk');
  expect(await (await frameAt(new URL(previewUrl).origin)).evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  const server = serverProcess();
  const viteChildren = groupMembers(server.pgid).filter((row) => row.ppid === server.pid && row.command.includes('vite-runner'));
  expect(viteChildren.length).toBeGreaterThan(0);
  for (const child of viteChildren) {
    expect(child.command).toContain(APP_BINARY);
    expect(processEnvKeys(child.pid)).toContain('ELECTRON_RUN_AS_NODE');
    expect(processCommandAndEnv(child.pid)).toContain(' ELECTRON_RUN_AS_NODE=1');
  }
  expect(app.windows().filter((window) => window.url().startsWith(origin))).toHaveLength(1);
});

test('Check Setup… opens the setup screen with every check', async () => {
  await app.evaluate(({ Menu }) => {
    const item = Menu.getApplicationMenu()?.items[0]?.submenu?.items.find((candidate) => candidate.label === 'Check Setup…');
    item?.click();
  });
  await expect.poll(() => app.windows().some((window) => window.url().endsWith('first-run.html'))).toBe(true);
  const setup = app.windows().find((window) => window.url().endsWith('first-run.html'));
  if (!setup) throw new Error('setup window missing');
  await expect(setup.locator('body[data-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  await expect(setup.locator('li.check')).toHaveCount(5);
  await setup.getByRole('button', { name: 'Done' }).click();
  await expect.poll(() => app.windows().some((window) => window.url().endsWith('first-run.html'))).toBe(false);
});

test('a server crash after ready offers Restart and the studio comes back', async () => {
  await app.evaluate(({ dialog }) => {
    const calls: { message?: string; detail?: string; buttons?: string[] }[] = [];
    (globalThis as { __dialogs?: typeof calls }).__dialogs = calls;
    dialog.showMessageBox = (async (...args: unknown[]) => {
      const options = (args.length > 1 ? args[1] : args[0]) as { message?: string; detail?: string; buttons?: string[] };
      calls.push({ message: options.message, detail: options.detail, buttons: options.buttons });
      return { response: 0, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
  });
  const before = serverProcess();
  process.kill(before.pid, 'SIGKILL');
  await expect.poll(() => app.evaluate(() => (globalThis as { __dialogs?: unknown[] }).__dialogs?.length ?? 0), { timeout: 15_000 }).toBe(1);
  const [shown] = await app.evaluate(() => (globalThis as { __dialogs?: { message?: string; detail?: string; buttons?: string[] }[] }).__dialogs ?? []);
  expect(shown?.message).toBe('The studio server stopped');
  expect(shown?.detail).toContain('server.log');
  expect(shown?.buttons?.[0]).toBe('Restart');
  await expect.poll(() => listProcesses().some((row) => row.ppid === app.process().pid && row.command.includes(SERVER_MARKER) && row.pid !== before.pid), { timeout: 30_000 }).toBe(true);
  await expect.poll(async () => (await page.locator('meta[name="studio-token"]').getAttribute('content').catch(() => token)) !== token, { timeout: 60_000 }).toBe(true);
  expect(new URL(page.url()).origin).toBe(origin);
  token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  expect((await call<Project[]>('GET', '/api/projects')).length).toBe(2);
});

test('quit stops the server and every Vite child', async () => {
  const server = serverProcess();
  const members = groupMembers(server.pgid).map((row) => row.pid);
  expect(members.length).toBeGreaterThan(1);
  await app.close();
  closed = true;
  await expect.poll(() => members.filter(alive), { timeout: 15_000 }).toEqual([]);
});
