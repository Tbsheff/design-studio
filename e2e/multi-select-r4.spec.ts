import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, mainDirection, openHome, setSelectMode } from './support/studio';

const SHOTS = process.env.STUDIO_R4_SHOTS ?? '';

async function openProject(page: Page, api: StudioApi, prompt: string): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt, kind: 'html' });
  await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText(prompt);
  return api.project(project.id);
}

async function settled(page: Page, api: StudioApi, pid: string, did: string): Promise<void> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  const versions = await api.versions(pid, did);
  await expect.poll(async () => (await api.project(pid)).directions.find((d) => d.id === did)?.headVersionId ?? null).toBe(versions[0]?.id ?? null);
}

async function shot(page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.getByRole('region', { name: 'Fill and border' }).scrollIntoViewIfNeeded();
  await page.locator('.inspector').screenshot({ path: path.join(SHOTS, `after-multi-${name}.png`) });
}

function cardLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.includes('<article') && line.includes('class="card"'));
}

const textSelection = (page: Page) => frontFrame(page).locator('body').evaluate(() => String(document.getSelection()));

test('Multi-select: Shift+click toggles, Mixed radius, one batch write, one undo', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, 'Mixed Radius Cards');
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  const read = () => readFileSync(file, 'utf8');
  const cards = frontFrame(page).locator('.card');
  const boxes = page.locator('.overlay .box.selected');
  const radius = page.getByLabel('Border radius', { exact: true });
  const corner = { position: { x: 6, y: 6 } };

  await setSelectMode(page, true);
  await cards.nth(0).click(corner);
  await expect(page.locator('.ins-tag')).toHaveText('article');
  await radius.fill('4');
  await radius.press('Enter');
  await expect.poll(() => cardLines(file)[0] ?? '').toContain('border-radius: 4px');
  await settled(page, api, project.id, main.id);
  const start = read();
  const versionsAtStart = (await api.versions(project.id, main.id)).length;

  await cards.nth(1).click(corner);
  await expect(boxes).toHaveCount(1);
  await cards.nth(0).click({ ...corner, modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(2);
  await cards.nth(2).click({ ...corner, modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(3);
  expect(await textSelection(page)).toBe('');
  await expect(page.locator('.ins-count')).toHaveText('3 elements');
  await expect(page.getByRole('region', { name: 'Text' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy CSS' })).toHaveCount(0);
  await expect(page.getByTestId('resize-frame')).toHaveCount(0);

  await expect(radius).toHaveValue('');
  await expect(radius).toHaveAttribute('placeholder', 'Mixed');
  await shot(page, 'mixed');

  await radius.fill('+8');
  await expect(radius).toHaveAttribute('aria-invalid', 'true');
  await radius.press('Enter');
  await expect(radius).toHaveAttribute('placeholder', 'Mixed');
  expect(read()).toBe(start);

  await radius.fill('8');
  for (let i = 0; i < 3; i += 1) await expect(cards.nth(i)).toHaveCSS('border-top-left-radius', '8px');
  await radius.press('Enter');
  await expect.poll(() => cardLines(file).filter((line) => line.includes('border-radius: 8px')).length).toBe(3);
  await settled(page, api, project.id, main.id);
  expect(cardLines(file).some((line) => line.includes('border-radius: 4px'))).toBe(false);
  expect((await api.versions(project.id, main.id)).length).toBe(versionsAtStart + 1);
  await expect(radius).toHaveValue('8px');
  await shot(page, 'shared');

  await page.locator('.canvas .stage').click({ position: { x: 8, y: 8 } });
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName ?? null)).not.toBe('IFRAME');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(read).toBe(start);
  await expect(frontFrame(page).locator('.card').nth(1)).toHaveCSS('border-top-left-radius', '12px');
  await expect(frontFrame(page).locator('.card').nth(0)).toHaveCSS('border-top-left-radius', '4px');

  await setSelectMode(page, true);
  await cards.nth(0).click(corner);
  await cards.nth(1).click({ ...corner, modifiers: ['Shift'] });
  await cards.nth(2).click({ ...corner, modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(3);
  await cards.nth(1).click({ ...corner, modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(2);
  await expect(page.locator('.ins-count')).toHaveText('2 elements');
  await cards.nth(1).click({ ...corner, modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(3);
  await cards.nth(2).click(corner);
  await expect(boxes).toHaveCount(1);
  await expect(page.locator('.ins-tag')).toHaveText('article');
  expect(await textSelection(page)).toBe('');

  await page.keyboard.press('Alt+1');
  const cardRows = page.locator('.layers-row[title="article .card"]');
  await expect(cardRows).toHaveCount(3);
  await cardRows.nth(0).click({ modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(2);
  await expect(page.locator('.ins-count')).toHaveText('2 elements');
  await cardRows.nth(0).click({ modifiers: ['Shift'] });
  await expect(boxes).toHaveCount(1);
  await cardRows.nth(1).click();
  await expect(boxes).toHaveCount(1);
});
