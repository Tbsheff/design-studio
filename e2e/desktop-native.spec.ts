import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { Project, RunSummary, Version } from '../src/shared/contracts';
import { desktopEnv, launchDesktop } from './support/desktop-app';

test.describe.configure({ mode: 'serial' });

interface Recorded {
  commands: { type: string }[];
  notices: { title: string; body: string; projectId: string; status: string }[];
  reveals: string[];
  exports: string[];
  recents: { id: string; folder: string }[];
  dialogs: string[];
}

let app: ElectronApplication;
let page: Page;
let origin = '';
let token = '';
let work = '';
let dataDir = '';
let userData = '';

async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(`${origin}${route}`, {
    method,
    headers: { 'x-studio-token': token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function recorded(): Promise<Recorded> {
  return app.evaluate(() => (globalThis as unknown as { __rec: Recorded }).__rec);
}

async function clickMenu(id: string): Promise<void> {
  await app.evaluate(({ Menu }, menuId) => {
    const item = Menu.getApplicationMenu()?.getMenuItemById(menuId);
    if (!item) throw new Error(`no menu item ${menuId}`);
    item.click();
  }, id);
}

async function finished(pid: string): Promise<number> {
  return (await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`)).filter((run) => run.status !== 'running').length;
}

function site(name: string): string {
  const dir = path.join(work, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html><body><h1>${name}</h1></body></html>\n`);
  return realpathSync(dir);
}

async function openedProjectName(): Promise<string> {
  await expect(page.locator('.topbar')).toBeVisible();
  return (await page.locator('.topbar').innerText()).trim();
}

test.beforeAll(async () => {
  work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio desktop native ')));
  dataDir = path.join(work, 'data');
  userData = path.join(work, 'user-data');
  mkdirSync(path.join(work, 'downloads'), { recursive: true });
  app = await launchDesktop(desktopEnv(work, { STUDIO_DESKTOP_NOTIFY: 'off', STUDIO_DESKTOP_DOWNLOADS: path.join(work, 'downloads') }));
  page = await app.firstWindow({ timeout: 120_000 });
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible({ timeout: 60_000 });
  origin = new URL(page.url()).origin;
  token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  await app.evaluate(({ app: electronApp, shell }) => {
    const rec: Recorded = { commands: [], notices: [], reveals: [], exports: [], recents: [], dialogs: [] };
    (globalThis as unknown as { __rec: Recorded }).__rec = rec;
    electronApp.on('studio-command' as 'ready', (command: unknown) => rec.commands.push(command as { type: string }));
    electronApp.on('studio-notification' as 'ready', (notice: unknown) => rec.notices.push(notice as Recorded['notices'][number]));
    electronApp.on('studio-export' as 'ready', (file: unknown) => rec.exports.push(String(file)));
    electronApp.on('studio-recent' as 'ready', (entry: unknown) => rec.recents.push(entry as { id: string; folder: string }));
    shell.showItemInFolder = (target: string) => {
      rec.reveals.push(target);
    };
  });
});

test.afterAll(async () => {
  if (app) await app.close();
});

test('the menus carry the native shortcuts', async () => {
  const items = await app.evaluate(({ Menu }) => {
    const out: Record<string, string> = {};
    const walk = (menu: Electron.Menu | null | undefined, top: string) => {
      for (const item of menu?.items ?? []) {
        const key = item.id || item.role || item.label;
        out[`${top}/${key}`] = item.accelerator ?? '';
        walk(item.submenu, top || item.label);
      }
    };
    walk(Menu.getApplicationMenu(), '');
    return out;
  });
  expect(items).toMatchObject({
    'File/new-project': 'CmdOrCtrl+N',
    'File/open-folder': 'CmdOrCtrl+O',
    'Edit/undo': 'CmdOrCtrl+Z',
    'Edit/redo': 'Shift+CmdOrCtrl+Z',
    'Run/run': 'CmdOrCtrl+Enter',
    'Run/stop': 'CmdOrCtrl+.',
  });
  expect(Object.keys(items)).toEqual(expect.arrayContaining(['File/recentdocuments', 'File/reveal-work-tree', 'File/reveal-export', 'View/zoomin', 'View/zoomout', 'View/resetzoom']));
});

test('Open Folder imports a folder, opens it, and records it as recent', async () => {
  const folder = site('menu folder');
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [chosen] })) as unknown as typeof dialog.showOpenDialog;
  }, folder);
  await clickMenu('open-folder');
  await expect.poll(openedProjectName).toContain('menu folder');
  const projects = await call<Project[]>('GET', '/api/projects');
  expect(projects.filter((project) => project.imported?.sourcePath === folder)).toHaveLength(1);
  await expect.poll(async () => (await recorded()).recents.map((entry) => entry.folder)).toContain(folder);
  const recents = JSON.parse(readFileSync(path.join(userData, 'recent-projects.json'), 'utf8')) as { folder: string }[];
  expect(recents[0]?.folder).toBe(folder);

  await clickMenu('new-project');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Describe the design');
  await clickMenu('open-folder');
  await expect.poll(openedProjectName).toContain('menu folder');
  expect((await call<Project[]>('GET', '/api/projects')).filter((project) => project.imported?.sourcePath === folder)).toHaveLength(1);
});

test('a folder dropped on the Dock (open-file) is imported; files and relative paths are ignored', async () => {
  const folder = site('dock folder');
  await clickMenu('new-project');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  const before = (await recorded()).commands.length;
  await app.evaluate(({ app: electronApp }, args) => {
    const event = { preventDefault: () => undefined };
    electronApp.emit('open-file', event, args.file);
    electronApp.emit('open-file', event, 'relative/folder');
    electronApp.emit('open-file', event, args.folder);
  }, { folder, file: path.join(folder, 'index.html') });
  await expect.poll(openedProjectName).toContain('dock folder');
  expect((await recorded()).commands.slice(before)).toEqual([{ type: 'open-folder', path: folder }]);
});

test('designstudio://open deep links open the project; bad links are dropped; a second instance forwards its link', async () => {
  const projects = await call<Project[]>('GET', '/api/projects');
  const first = projects.find((project) => project.name.includes('menu folder'));
  const second = projects.find((project) => project.name.includes('dock folder'));
  if (!first || !second) throw new Error('projects missing');
  await clickMenu('new-project');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  const before = (await recorded()).commands.length;
  await app.evaluate(({ app: electronApp }, ids) => {
    const event = { preventDefault: () => undefined };
    electronApp.emit('open-url', event, 'designstudio://open?project=../../etc');
    electronApp.emit('open-url', event, 'https://example.com/open?project=x');
    electronApp.emit('open-url', event, `designstudio://open?project=${ids.first}`);
  }, { first: first.id });
  await expect.poll(openedProjectName).toContain('menu folder');
  expect((await recorded()).commands.slice(before)).toEqual([{ type: 'open-project', projectId: first.id }]);
  await app.evaluate(({ app: electronApp }, id) => {
    electronApp.emit('second-instance', {}, ['/Applications/Design Studio.app/Contents/MacOS/Design Studio', `designstudio://open?project=${id}`], '/');
  }, second.id);
  await expect.poll(openedProjectName).toContain('dock folder');
});

test('Undo goes to the text field when typing and to version undo on the canvas', async () => {
  await clickMenu('new-project');
  await page.getByLabel('Describe the design').fill('Native undo check');
  await page.getByRole('radio', { name: 'HTML' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  const project = (await call<Project[]>('GET', '/api/projects')).find((item) => item.name.includes('Native undo check'));
  const main = project?.directions[0];
  if (!project || !main) throw new Error('project missing');
  await expect.poll(() => finished(project.id), { timeout: 60_000 }).toBe(1);
  await call('POST', `/api/projects/${project.id}/d/${main.id}/runs`, { prompt: 'Make the headline bolder', mode: 'edit' });
  await expect.poll(() => finished(project.id), { timeout: 60_000 }).toBe(2);
  const versions = () => call<Version[]>('GET', `/api/projects/${project.id}/d/${main.id}/versions`);
  await expect.poll(async () => (await versions()).length).toBeGreaterThanOrEqual(2);
  const count = (await versions()).length;

  const box = page.getByPlaceholder('Describe a change');
  await box.click();
  await page.keyboard.type('abc');
  await clickMenu('undo');
  await expect.poll(() => box.inputValue()).not.toBe('abc');
  expect((await versions()).length).toBe(count);

  await box.fill('');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await clickMenu('undo');
  await expect.poll(async () => (await versions())[0]?.meta.kind).toBe('undo');
});

test('Run sends the draft, Stop cancels the run, and a background finish notifies', async () => {
  const project = (await call<Project[]>('GET', '/api/projects')).find((item) => item.name.includes('Native undo check'));
  if (!project) throw new Error('project missing');
  const done = await finished(project.id);
  await page.getByPlaceholder('Describe a change').fill('Make it calmer [slow]');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await clickMenu('run');
  await expect.poll(async () => (await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`)).some((run) => run.status === 'running')).toBe(true);
  await expect.poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.getMenuItemById('stop')?.enabled)).toBe(true);
  await clickMenu('stop');
  await expect.poll(async () => (await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`)).filter((run) => run.status === 'canceled').length).toBe(1);
  expect((await recorded()).notices.filter((notice) => notice.status === 'canceled')).toEqual([]);

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((window) => window.isVisible())?.minimize());
  const main = project.directions[0];
  if (!main) throw new Error('no direction');
  await call('POST', `/api/projects/${project.id}/d/${main.id}/runs`, { prompt: 'Background finish', mode: 'edit' });
  await expect.poll(() => finished(project.id), { timeout: 60_000 }).toBe(done + 2);
  const background = async () => (await recorded()).notices.filter((item) => item.body.includes('Background finish'));
  await expect.poll(async () => (await background()).length).toBe(1);
  const [notice] = await background();
  expect(notice).toMatchObject({ title: 'Run finished', projectId: project.id, status: 'completed' });
  expect(notice?.body).toContain('Background finish');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((window) => window.isMinimized())?.restore());
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((window) => window.isMinimized()))).toBe(false);
});

test('Reveal in Finder shows the work tree and the last export, never a path outside the data folder', async () => {
  const project = (await call<Project[]>('GET', '/api/projects')).find((item) => item.name.includes('Native undo check'));
  const main = project?.directions[0];
  if (!project || !main) throw new Error('project missing');
  await clickMenu('reveal-work-tree');
  await expect.poll(async () => (await recorded()).reveals).toContain(main.workTree);
  expect(main.workTree.startsWith(dataDir)).toBe(true);

  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['zip bytes'], { type: 'application/zip' }));
    link.download = 'export check.zip';
    link.click();
  });
  await expect.poll(async () => (await recorded()).exports.length).toBe(1);
  const [exported] = (await recorded()).exports;
  expect(exported).toBe(path.join(work, 'downloads', 'export check.zip'));
  expect(existsSync(exported ?? '')).toBe(true);
  await clickMenu('reveal-export');
  await expect.poll(async () => (await recorded()).reveals).toContain(exported);
});

test('window bounds are saved per display layout', async () => {
  const file = path.join(userData, 'window-state.json');
  await expect
    .poll(async () => {
      await app.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows().find((candidate) => candidate.isVisible() && !candidate.isMinimized());
        if (window && window.getNormalBounds().width !== 1100) window.setBounds({ x: 40, y: 60, width: 1100, height: 760 });
      });
      if (!existsSync(file)) return null;
      const state = JSON.parse(readFileSync(file, 'utf8')) as { last: string; layouts: Record<string, { bounds: { width: number } }> };
      return state.layouts[state.last]?.bounds.width ?? null;
    })
    .toBe(1100);
  const key = (JSON.parse(readFileSync(file, 'utf8')) as { last: string }).last;
  expect(key).toMatch(/^\d+:-?\d+,-?\d+,\d+x\d+/);
});

test('the app uses the native folder dialog for Location and Open Folder, attached to the studio window', async () => {
  const parent = path.join(work, 'picked parent');
  mkdirSync(parent, { recursive: true });
  const realParent = realpathSync(parent);
  const menuSite = site('menu picked site');
  type DialogCall = { parented: boolean; title: string | null; properties: string[]; defaultPath: string | null };
  await app.evaluate(({ dialog, BrowserWindow }, answers) => {
    const calls: DialogCall[] = [];
    const queue = [...answers];
    (globalThis as unknown as { __dialogCalls: DialogCall[] }).__dialogCalls = calls;
    dialog.showOpenDialog = (async (first: unknown, second?: Electron.OpenDialogOptions) => {
      const options = (second ?? first) as Electron.OpenDialogOptions;
      calls.push({ parented: first instanceof BrowserWindow, title: options.title ?? null, properties: options.properties ?? [], defaultPath: options.defaultPath ?? null });
      return { canceled: false, filePaths: [queue.shift() ?? ''] };
    }) as unknown as typeof dialog.showOpenDialog;
  }, [realParent, menuSite]);
  const dialogCalls = () => app.evaluate(() => (globalThis as unknown as { __dialogCalls: DialogCall[] }).__dialogCalls);

  await clickMenu('new-project');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await page.getByLabel('Describe the design').fill('Desktop folder page');
  await page.getByLabel('Location').selectOption({ label: 'Choose folder…' });
  await expect(page.getByLabel('Location')).toHaveValue(realParent);
  const [locationCall] = await dialogCalls();
  expect(locationCall).toMatchObject({ parented: true, title: 'Choose where to save the new project' });
  expect(locationCall?.properties).toEqual(expect.arrayContaining(['openDirectory', 'createDirectory']));

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect.poll(openedProjectName).toContain('Desktop folder page');
  const created = (await call<Project[]>('GET', '/api/projects')).find((project) => project.name === 'Desktop folder page');
  expect(created?.imported).toEqual({ sourcePath: path.join(realParent, 'desktop-folder-page'), created: true });
  await expect.poll(() => finished(created!.id), { timeout: 60_000 }).toBe(1);

  await clickMenu('open-folder');
  await expect.poll(openedProjectName).toContain('menu picked site');
  const calls = await dialogCalls();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toMatchObject({ parented: true, title: 'Open Folder' });
  expect(calls[1]?.properties).toEqual(expect.arrayContaining(['openDirectory', 'createDirectory']));
  expect((await call<Project[]>('GET', '/api/projects')).filter((project) => project.imported?.sourcePath === menuSite)).toHaveLength(1);
});
