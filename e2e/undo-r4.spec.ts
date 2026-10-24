import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, type StudioApi, frontFrame, mainDirection, openHome, selectInFrame, setSelectMode } from './support/studio';

async function settled(page: Page, api: StudioApi, pid: string, did: string): Promise<void> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  const versions = await api.versions(pid, did);
  await expect.poll(async () => (await api.project(pid)).directions.find((d) => d.id === did)?.headVersionId ?? null).toBe(versions[0]?.id ?? null);
}

async function focusCanvas(page: Page): Promise<void> {
  await page.locator('.canvas .stage').click({ position: { x: 8, y: 8 } });
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName ?? null)).not.toBe('IFRAME');
}

test('Cmd+Z undoes three direct edits to the exact start bytes and Shift+Cmd+Z redoes them', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Harbor Undo Stack', 'html');
  const main = mainDirection(project);
  await api.waitForRuns(project.id, 1);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Harbor Undo Stack');
  const file = path.join(main.workTree, 'index.html');
  const read = () => readFileSync(file, 'utf8');
  const states = [read()];

  await selectInFrame(page, 'h1');
  const fontSize = page.getByLabel('Font size', { exact: true });
  await fontSize.fill('48');
  await fontSize.press('Enter');
  await expect.poll(read).not.toBe(states[0]);
  await settled(page, api, project.id, main.id);
  states.push(read());

  const color = page.getByLabel('Text color', { exact: true });
  await color.fill('#c2410c');
  await color.press('Enter');
  await expect.poll(read).not.toBe(states[1]);
  await settled(page, api, project.id, main.id);
  states.push(read());

  const text = page.getByLabel('Text content');
  await text.fill('Roasted every morning');
  await text.press('ControlOrMeta+Enter');
  await expect.poll(read).not.toBe(states[2]);
  await settled(page, api, project.id, main.id);
  states.push(read());
  await expect(frame.locator('h1')).toHaveText('Roasted every morning');

  await focusCanvas(page);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(read).toBe(states[2]);
  await expect(page.locator('.ds-toast')).toHaveText('Undid edit text of h1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(read).toBe(states[1]);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(read).toBe(states[0]);
  await expect(frontFrame(page).locator('h1')).toHaveText('Harbor Undo Stack');
  await expect(frontFrame(page).locator('h1')).not.toHaveCSS('font-size', '48px');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.ds-toast')).toHaveText('Nothing more to undo');
  expect(read()).toBe(states[0]);

  await selectInFrame(page, 'h1');
  await expect(fontSize).not.toHaveValue('48px');
  await setSelectMode(page, false);
  await frontFrame(page).locator('h1').click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName ?? null)).toBe('IFRAME');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(read).toBe(states[1]);
  await expect(page.locator('.ds-toast')).toHaveText('Redid edit h1: font-size');
  await expect(fontSize).toHaveValue('48px');

  await focusCanvas(page);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(read).toBe(states[2]);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(read).toBe(states[3]);
  await expect(frontFrame(page).locator('h1')).toHaveText('Roasted every morning');

  await page.keyboard.press('ControlOrMeta+Shift+z');
  await page.waitForTimeout(300);
  expect(read()).toBe(states[3]);
});
