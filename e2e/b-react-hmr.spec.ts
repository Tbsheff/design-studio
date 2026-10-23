import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, sendPrompt } from './support/studio';

const CREATE_PROMPT = 'Orbit Analytics';
const EDIT_PROMPT = 'Charts that update live';

async function viteFrame(page: Page, origin: string): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => frame.url().startsWith(origin))).toBe(true);
  const frame = page.frames().find((candidate) => candidate.url().startsWith(origin));
  if (!frame) throw new Error('vite frame not found');
  return frame;
}

test('B: React mock edit through selection uses HMR without reload', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, CREATE_PROMPT, 'react');
  const main = mainDirection(project);
  const frame = frontFrame(page);

  await expect(frame.locator('h1')).toHaveText(CREATE_PROMPT, { timeout: 60_000 });
  await api.waitForRuns(project.id, 1);
  const previewBefore = (await api.preview(project.id, main.id)).url;
  const origin = new URL(previewBefore).origin;
  expect(origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  const iframeSrcBefore = await page.locator('iframe.frame.front').getAttribute('src');
  expect(iframeSrcBefore?.startsWith(origin)).toBe(true);

  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  const sourceBefore = readFileSync(appFile, 'utf8');
  const paragraphBefore = await frame.locator('section.hero p').textContent();

  const vite = await viteFrame(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __marker?: number }).__marker = 1;
  });

  await selectInFrame(page, 'h1');
  await sendPrompt(page, EDIT_PROMPT);
  await expect(frame.locator('h1')).toHaveText(EDIT_PROMPT);
  await api.waitForRuns(project.id, 2);

  const sameFrame = await viteFrame(page, origin);
  expect(await sameFrame.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  expect(await page.locator('iframe.frame').count()).toBe(1);
  expect(await page.locator('iframe.frame.front').getAttribute('src')).toBe(iframeSrcBefore);
  expect((await api.preview(project.id, main.id)).url).toBe(previewBefore);
  await expect(frame.locator('section.hero p')).toHaveText(paragraphBefore ?? '');

  const sourceAfter = readFileSync(appFile, 'utf8');
  expect(sourceAfter).toBe(sourceBefore.replace(`<h1>${CREATE_PROMPT}</h1>`, `<h1>${EDIT_PROMPT}</h1>`));

  await api.call('PUT', `/api/projects/${project.id}/design-md`, { content: '# Notes\n\nNo DOM change here.\n' });
  await page.waitForTimeout(3500);
  expect(await page.locator('iframe.frame.front').getAttribute('src')).toBe(iframeSrcBefore);
  expect(await (await viteFrame(page, origin)).evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
});
