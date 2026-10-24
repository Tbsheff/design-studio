import { expect, type FrameLocator, type Page } from '@playwright/test';
import type { Direction, Project, RunSummary, Version, WorkTreeStatus } from '../../src/shared/contracts';
import { needsQuestions } from '../../src/shared/clarify';
import { BASE_URL } from './server';

export class StudioApi {
  constructor(readonly token: string) {}

  async call<T>(method: string, route: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${route}`, {
      method,
      headers: { 'x-studio-token': this.token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  projects(): Promise<Project[]> {
    return this.call('GET', '/api/projects');
  }

  project(pid: string): Promise<Project> {
    return this.call('GET', `/api/projects/${pid}`);
  }

  versions(pid: string, did: string): Promise<Version[]> {
    return this.call('GET', `/api/projects/${pid}/d/${did}/versions`);
  }

  status(pid: string, did: string): Promise<WorkTreeStatus> {
    return this.call('GET', `/api/projects/${pid}/d/${did}/status`);
  }

  runs(pid: string): Promise<RunSummary[]> {
    return this.call('GET', `/api/projects/${pid}/runs`);
  }

  preview(pid: string, did: string): Promise<{ url: string }> {
    return this.call('GET', `/api/projects/${pid}/d/${did}/preview`);
  }

  async waitForRuns(pid: string, count: number, timeoutMs = 60_000): Promise<RunSummary[]> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const runs = await this.runs(pid);
      const finished = runs.filter((run) => run.status !== 'running');
      if (finished.length >= count) return runs;
      if (Date.now() > deadline) throw new Error(`expected ${count} finished runs, saw ${finished.length}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function openHome(page: Page): Promise<StudioApi> {
  await page.goto('/');
  const token = await page.locator('meta[name="studio-token"]').getAttribute('content');
  if (!token) throw new Error('studio token meta tag missing');
  await page.evaluate(() => localStorage.removeItem('design-studio.ui.v1'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  return new StudioApi(token);
}

export async function openFolderByPath(page: Page, folder: string): Promise<void> {
  await page.getByRole('button', { name: 'Or paste a path' }).click();
  await page.getByPlaceholder('/Users/me/projects/site').fill(folder);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
}

export async function clickCreate(page: Page): Promise<void> {
  const prompt = await page.getByLabel('Describe the design').inputValue();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  if (needsQuestions(prompt)) await page.getByRole('button', { name: 'Skip questions' }).click();
}

export async function createProjectViaUi(page: Page, api: StudioApi, prompt: string, kind: 'html' | 'react'): Promise<Project> {
  const before = new Set((await api.projects()).map((project) => project.id));
  await page.getByLabel('Describe the design').fill(prompt);
  await page.getByRole('radio', { name: kind === 'html' ? 'HTML' : 'React + Vite' }).click();
  await clickCreate(page);
  await expect(page.locator('.topbar')).toBeVisible();
  const created = (await api.projects()).find((project) => !before.has(project.id));
  if (!created) throw new Error('created project not found');
  return created;
}

export function frontFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe.frame.front');
}

export async function setSelectMode(page: Page, on: boolean): Promise<void> {
  const button = page.getByRole('button', { name: /^Select/ });
  if ((await button.getAttribute('aria-pressed')) !== String(on)) await button.click();
  await expect(button).toHaveAttribute('aria-pressed', String(on));
}

export async function selectInFrame(page: Page, selector: string): Promise<void> {
  await setSelectMode(page, true);
  await page.evaluate(() => {
    const w = window as unknown as { __studioPicked?: string | null; __studioPickWatch?: boolean };
    w.__studioPicked = null;
    if (w.__studioPickWatch) return;
    w.__studioPickWatch = true;
    window.addEventListener('message', (event) => {
      const data = event.data as { ns?: string; type?: string; selection?: { selector?: string } } | null;
      if (data?.ns === 'studio' && data.type === 'select' && data.selection?.selector) w.__studioPicked = data.selection.selector;
    });
  });
  await frontFrame(page).locator(selector).first().click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const picked = (window as unknown as { __studioPicked?: string | null }).__studioPicked;
        const boxes = [...document.querySelectorAll<HTMLElement>('.overlay .box.selected')];
        return Boolean(picked) && boxes.length === 1 && boxes[0]?.dataset.selector === picked;
      }),
    )
    .toBe(true);
}

export async function openRunSettings(page: Page): Promise<void> {
  const trigger = page.getByTestId('run-settings');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  await expect(page.getByTestId('run-settings-popover')).toBeVisible();
}

export async function closeRunSettings(page: Page): Promise<void> {
  const trigger = page.getByTestId('run-settings');
  if ((await trigger.getAttribute('aria-expanded')) === 'true') await page.keyboard.press('Escape');
  await expect(page.getByTestId('run-settings-popover')).toHaveCount(0);
}

export async function chooseRunSetting(page: Page, testIdOrName: { testId: string } | { radio: string }): Promise<void> {
  await openRunSettings(page);
  const popover = page.getByTestId('run-settings-popover');
  const target = 'testId' in testIdOrName ? popover.getByTestId(testIdOrName.testId) : popover.getByRole('radio', { name: testIdOrName.radio });
  await target.click();
}

export async function sendPrompt(page: Page, prompt: string): Promise<void> {
  const box = page.getByPlaceholder('Describe a change');
  await box.fill(prompt);
  await page.getByRole('button', { name: 'Send' }).click();
}

export async function headVersion(api: StudioApi, pid: string, did: string): Promise<Version> {
  const project = await api.project(pid);
  const direction = project.directions.find((candidate) => candidate.id === did);
  if (!direction?.headVersionId) throw new Error('direction has no head');
  const versions = await api.versions(pid, did);
  const head = versions.find((version) => version.id === direction.headVersionId);
  if (!head) throw new Error('head version not listed');
  return head;
}

export function mainDirection(project: Project): Direction {
  const main = project.directions[0];
  if (!main) throw new Error('project has no direction');
  return main;
}

export async function showVersions(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: 'Versions' });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

export function versionRow(page: Page, title: string | RegExp) {
  return page.locator('li.version').filter({ has: page.locator('.version-title', { hasText: title }) });
}
