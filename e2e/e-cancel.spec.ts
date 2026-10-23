import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { RunSummary } from '../src/shared/contracts';
import { createProjectViaUi, frontFrame, headVersion, mainDirection, openHome, sendPrompt, type StudioApi } from './support/studio';

const CREATE_PROMPT = 'Lighthouse Books';

async function cancelMidWrite(page: Page, api: StudioApi, pid: string, indexFile: string, before: string, prompt: string): Promise<RunSummary> {
  await sendPrompt(page, prompt);
  await expect.poll(() => readFileSync(indexFile, 'utf8') !== before, { timeout: 15_000, intervals: [50] }).toBe(true);
  const running = (await api.runs(pid)).find((run) => run.request.prompt === prompt);
  expect(running?.status).toBe('running');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(async () => (await api.runs(pid)).find((run) => run.request.prompt === prompt)?.status).toBe('canceled');
  const run = (await api.runs(pid)).find((candidate) => candidate.request.prompt === prompt);
  if (!run) throw new Error('canceled run missing');
  expect(run.versionId).toBeNull();
  return run;
}

test('E: cancel mid-edit, then discard; cancel again, then keep', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText(CREATE_PROMPT);
  await api.waitForRuns(project.id, 1);
  const completed = await headVersion(api, project.id, main.id);
  const indexFile = path.join(main.workTree, 'index.html');
  const completedHtml = readFileSync(indexFile, 'utf8');

  await cancelMidWrite(page, api, project.id, indexFile, completedHtml, '[slow] Add a long store history section');
  const partial = readFileSync(indexFile, 'utf8');
  expect(partial).not.toBe(completedHtml);
  expect(partial.length).toBeLessThan(completedHtml.length);

  const banner = page.locator('.banner');
  await expect(banner).toContainText('Unfinished changes in 1 file');
  expect((await api.status(project.id, main.id)).changed).toEqual(['index.html']);
  expect((await headVersion(api, project.id, main.id)).id).toBe(completed.id);
  await expect(page.locator('li.version')).toHaveCount(1);
  await expect(page.locator('li.version').first()).toContainText(completed.title);
  await page.getByRole('radio', { name: 'Last completed' }).click();
  await expect(frontFrame(page).locator('h1')).toHaveText(CREATE_PROMPT);
  await expect(frontFrame(page).locator('.card')).toHaveCount(3);
  await page.getByRole('radio', { name: 'Live', exact: true }).click();
  await expect(page.locator('.msg-body', { hasText: '[slow] Add a long store history section' })).toBeVisible();
  await expect(page.locator('.status.canceled')).toHaveCount(1);

  await banner.getByRole('button', { name: 'Discard' }).click();
  await expect(banner).toHaveCount(0);
  expect(readFileSync(indexFile, 'utf8')).toBe(completedHtml);
  expect((await api.status(project.id, main.id)).dirty).toBe(false);
  await expect(frontFrame(page).locator('.card')).toHaveCount(3);
  await expect(page.locator('li.version')).toHaveCount(1);

  await cancelMidWrite(page, api, project.id, indexFile, completedHtml, '[slow] Add an events calendar');
  const partialTwo = readFileSync(indexFile, 'utf8');
  await expect(banner).toContainText('Unfinished changes in 1 file');
  await banner.getByRole('button', { name: 'Keep' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.locator('li.version')).toHaveCount(2);
  const kept = await headVersion(api, project.id, main.id);
  expect(kept.meta.kind).toBe('keep');
  expect(kept.parentId).toBe(completed.id);
  expect(kept.changedFiles).toEqual(['index.html']);
  expect(readFileSync(indexFile, 'utf8')).toBe(partialTwo);
  expect((await api.status(project.id, main.id)).dirty).toBe(false);
});
