import { mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { Project, Version } from '../src/shared/contracts';
import { desktopEnv, launchDesktop, PACKAGED_EXECUTABLE } from './support/desktop-app';
import { listProcesses, processCommandAndEnv } from './support/processes';

let app: ElectronApplication | null = null;

test.afterAll(async () => {
  await app?.close();
});

async function studioWindow(electronApp: ElectronApplication): Promise<Page> {
  await expect.poll(() => electronApp.windows().some((window) => window.url().startsWith('http://127.0.0.1:'))).toBe(true);
  const page = electronApp.windows().find((window) => window.url().startsWith('http://127.0.0.1:'));
  if (!page) throw new Error('studio window not found');
  return page;
}

async function api<T>(origin: string, token: string, route: string): Promise<T> {
  const res = await fetch(`${origin}${route}`, { headers: { 'x-studio-token': token } });
  if (!res.ok) throw new Error(`${route} -> ${res.status}`);
  return (await res.json()) as T;
}

test('setup screen lists the checks, then the studio opens with bundled git and versions work', async () => {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio desktop setup ')));
  app = await launchDesktop(desktopEnv(work, { STUDIO_DESKTOP_SETUP: 'always', STUDIO_DESKTOP_GIT: 'bundled' }));
  const setup = await app.firstWindow();
  expect(setup.url()).toMatch(/first-run\.html$/);
  await expect(setup.locator('body[data-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const ids = await setup.locator('li.check').evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.check));
  expect(ids).toEqual(['git', 'claude', 'disk', 'network', 'design-memory']);
  await expect(setup.locator('li[data-check="git"]')).toHaveAttribute('data-status', 'ok');
  await expect(setup.locator('li[data-check="git"] .detail')).toContainText('Bundled git');
  await expect(setup.locator('li[data-check="git"] button[data-fix="install-clt"]')).toBeVisible();
  await setup.getByRole('button', { name: 'Continue' }).click();

  const page = await studioWindow(app);
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible({ timeout: 60_000 });
  const origin = new URL(page.url()).origin;
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  const server = listProcesses().find((row) => row.ppid === app?.process().pid && /server\/index\.(js|ts)/.test(row.command));
  if (!server) throw new Error('server child not found');
  expect(processCommandAndEnv(server.pid)).toContain(PACKAGED_EXECUTABLE ? '/Contents/Resources/git/bin/git' : '/dugite/git/bin/git');

  await page.getByLabel('Describe the design').fill('Bundled git check');
  await page.getByRole('radio', { name: 'HTML' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.frameLocator('iframe.frame.front').locator('h1')).toHaveText('Bundled git check', { timeout: 60_000 });
  const [project] = await api<Project[]>(origin, token, '/api/projects');
  const main = project?.directions[0];
  if (!project || !main) throw new Error('project not created');
  await expect.poll(async () => (await api<Version[]>(origin, token, `/api/projects/${project.id}/d/${main.id}/versions`)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
});
