import { mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, type Page } from '@playwright/test';
import type { Project, RenderCheckResult, RunSummary, Version } from '../src/shared/contracts.js';

const CLEAN_PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
const KEPT_ENV = ['HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'LANG'];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanEnv(work: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of KEPT_ENV) if (process.env[key]) env[key] = process.env[key] as string;
  return {
    ...env,
    PATH: CLEAN_PATH,
    STUDIO_DESKTOP_GIT: 'bundled',
    STUDIO_DESKTOP_SETUP: 'always',
    STUDIO_DESKTOP_NOTIFY: 'off',
    STUDIO_AGENT: 'mock',
    STUDIO_DATA_DIR: path.join(work, 'data'),
    STUDIO_DESKTOP_USER_DATA: path.join(work, 'user-data'),
  };
}

async function waitFor<T>(label: string, read: () => Promise<T | null>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read().catch(() => null);
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(500);
  }
}

async function main(): Promise<void> {
  const appPath = process.argv[2];
  if (!appPath) throw new Error('usage: tsx scripts/clean-machine-check.ts <Design Studio.app>');
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio clean machine ')));
  const app = await electron.launch({ executablePath: path.join(appPath, 'Contents', 'MacOS', 'Design Studio'), args: [], env: cleanEnv(work), timeout: 120_000 });
  try {
    const setup = await waitFor('setup window', async () => app.windows().find((window) => window.url().endsWith('first-run.html')) ?? null, 60_000);
    await setup.locator('li.check[data-status]:not([data-status="running"])').first().waitFor();
    await sleep(2000);
    const checks = await setup.locator('li.check').evaluateAll((items) => items.map((item) => `${item.getAttribute('data-check')}=${item.getAttribute('data-status')}: ${(item.querySelector('.detail')?.textContent ?? '').trim()}`));
    for (const line of checks) console.log(`[clean] check ${line}`);
    await setup.getByRole('button', { name: 'Continue' }).click();
    const page: Page = await waitFor('studio window', async () => app.windows().find((window) => window.url().startsWith('http://127.0.0.1:')) ?? null, 90_000);
    await page.getByRole('heading', { name: 'New project' }).waitFor({ timeout: 60_000 });
    const origin = new URL(page.url()).origin;
    const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
    const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
      const res = await fetch(`${origin}${route}`, { method, headers: { 'x-studio-token': token, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    };
    for (const kind of ['html', 'react'] as const) {
      const { project } = await call<{ project: Project }>('POST', '/api/projects', { prompt: `Clean machine ${kind}`, kind });
      const main = project.directions[0];
      if (!main) throw new Error('no direction');
      const runs = await waitFor('mock run', async () => {
        const list = await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`);
        return list.length > 0 && list.every((run) => run.status !== 'running') ? list : null;
      }, 180_000);
      const versions = await call<Version[]>('GET', `/api/projects/${project.id}/d/${main.id}/versions`);
      const checked = await call<RenderCheckResult[]>('POST', `/api/projects/${project.id}/d/${main.id}/check`);
      console.log(`[clean] ${kind}: run ${runs.map((run) => run.status).join(',')}, versions ${versions.length}, render_check ${checked.map((result) => `${result.viewport}:${result.backend}:ok=${result.ok}`).join(' ')}`);
    }
    const env = await app.evaluate(() => process.env.PATH ?? '');
    console.log(`[clean] app PATH ${env}`);
  } finally {
    await app.close();
  }
  console.log(`[clean] work ${work}`);
}

main().catch((error: unknown) => {
  console.error('[clean] failed', error);
  process.exit(1);
});
