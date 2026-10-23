import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { TWEAKS_FILE } from '../src/shared/tweaks';
import { ROOT } from './support/server';
import { type StudioApi, frontFrame, mainDirection, openHome, sendPrompt, showVersions } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;

async function openProject(page: Page, api: StudioApi, prompt: string): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt, kind: 'html' });
  await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  return api.project(project.id);
}

interface Probe {
  radius: string;
  color: string;
  gap: string;
  marker: string | null;
}

async function plant(frame: FrameLocator): Promise<void> {
  await frame.locator('body').evaluate(() => {
    (window as unknown as { __marker?: string }).__marker = 'kept';
  });
}

async function probe(frame: FrameLocator): Promise<Probe> {
  return frame.locator('body').evaluate(() => {
    const card = document.querySelector('.card');
    const cards = document.querySelector('.cards');
    const h1 = document.querySelector('h1');
    return {
      radius: card ? getComputedStyle(card).borderTopLeftRadius : '',
      color: h1 ? getComputedStyle(h1).color : '',
      gap: cards ? getComputedStyle(cards).rowGap : '',
      marker: (window as unknown as { __marker?: string }).__marker ?? null,
    };
  });
}

async function shoot(page: Page, name: string, focus: Locator): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await focus.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, `tweaks-${name}-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(250);
}

async function dragSlider(page: Page, slider: Locator, fraction: number): Promise<void> {
  const box = await slider.boundingBox();
  if (!box) throw new Error('slider has no box');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 4, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) await page.mouse.move(box.x + 4 + ((box.width - 8) * fraction * i) / 6, y);
  await page.mouse.up();
}

test('tweaks panel: empty state offers a suggest run', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, 'Plain Page');
  await page.getByRole('tab', { name: /^Tweaks/ }).click();
  const empty = page.locator('.twk-empty');
  await expect(empty).toContainText('No tweaks yet');
  await shoot(page, 'empty', empty);
  await empty.getByRole('button', { name: 'Suggest tweaks' }).click();
  const runs = await api.waitForRuns(project.id, 2);
  expect(runs.some((run) => run.request.task === 'tweaks')).toBe(true);
  await page.getByRole('tab', { name: /^Tweaks/ }).click();
  await expect(page.locator('li.twk-row')).toHaveCount(3);
});

test('tweaks panel: drag previews every frame with no reload, commit makes one version, undo restores bytes', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, 'Tweaks Studio [tweaks]');
  const main = mainDirection(project);
  const indexPath = path.join(main.workTree, 'index.html');
  const tweaksPath = path.join(main.workTree, TWEAKS_FILE);
  await expect(frontFrame(page).locator('h1')).toHaveText('Tweaks Studio');

  await sendPrompt(page, 'Add a short note');
  await api.waitForRuns(project.id, 2);
  await expect(frontFrame(page).locator('.mock-edit')).toHaveCount(1);
  const htmlBefore = readFileSync(indexPath, 'utf8');
  const tweaksBefore = readFileSync(tweaksPath, 'utf8');

  const front = frontFrame(page);
  await plant(front);
  await expect.poll(async () => (await probe(front)).radius).toBe('12px');

  await page.getByRole('tab', { name: /^Tweaks/ }).click();
  await expect(page.locator('li.twk-row')).toHaveCount(3);
  const radiusRow = page.locator('li.twk-row[data-tweak="radius"]');
  const slider = radiusRow.locator('input[type="range"]');
  await dragSlider(page, slider, 0.75);
  await expect.poll(async () => (await probe(front)).radius).not.toBe('12px');
  const dragged = (await probe(front)).radius;
  await expect(radiusRow.locator('.twk-readout')).toHaveText(dragged);
  expect((await probe(front)).marker).toBe('kept');
  await expect(radiusRow).toHaveClass(/changed/);

  await page.getByLabel('Accent', { exact: true }).fill('#ff3366');
  await expect.poll(async () => (await probe(front)).color).toBe('rgb(255, 51, 102)');
  await expect(page.locator('.twk-count')).toHaveText('2 changes');
  await expect(page.getByRole('tab', { name: /^Tweaks/ })).toContainText('2');
  await page.locator('.twk-title').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.twk-count')).toHaveText('1 change');
  await expect.poll(async () => (await probe(front)).color).toBe('rgb(15, 107, 92)');
  expect((await probe(front)).radius).toBe(dragged);

  const gapSlider = page.locator('li.twk-row[data-tweak="gap"] input[type="range"]');
  await gapSlider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await probe(front)).gap).toBe('32px');
  await expect(page.locator('.twk-count')).toHaveText('2 changes');
  await shoot(page, 'panel-pending', radiusRow);
  await page.locator('li.twk-row[data-tweak="gap"]').getByRole('button', { name: 'Reset Card gap' }).click();
  await expect.poll(async () => (await probe(front)).gap).toBe('24px');
  expect((await probe(front)).marker).toBe('kept');

  await showVersions(page);
  const rows = page.locator('li.version');
  await rows.nth(0).getByRole('button', { name: 'Compare' }).click();
  await rows.nth(1).getByRole('button', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(page.locator('.compare-pane')).toHaveCount(2);
  const panes = [page.frameLocator('.compare-pane:nth-child(1) iframe'), page.frameLocator('.compare-pane:nth-child(2) iframe')];
  for (const pane of panes) {
    await expect(pane.locator('h1')).toHaveText('Tweaks Studio');
    await expect.poll(async () => (await probe(pane)).radius).toBe(dragged);
  }
  await page.getByRole('button', { name: 'Close compare' }).click();
  await expect(front.locator('h1')).toBeVisible();

  await page.getByRole('tab', { name: /^Tweaks/ }).click();
  const versionsBefore = (await api.versions(project.id, main.id)).length;
  await page.getByRole('button', { name: 'Commit', exact: true }).click();
  await expect(page.locator('.twk-footer')).toHaveCount(0);
  await expect.poll(() => readFileSync(indexPath, 'utf8')).toContain(`--tw-radius: ${dragged};`);
  expect(readFileSync(indexPath, 'utf8')).toBe(htmlBefore.replace('--tw-radius: 12px;', `--tw-radius: ${dragged};`));
  await expect.poll(async () => (await api.versions(project.id, main.id)).length).toBe(versionsBefore + 1);
  const head = (await api.versions(project.id, main.id))[0];
  expect(head?.title).toBe('Tweak: Corner radius');
  expect(JSON.parse(readFileSync(tweaksPath, 'utf8')).controls[1].default).toBe(Number.parseFloat(dragged));
  await expect(radiusRow.locator('.twk-readout')).toHaveText(dragged);
  await expect(radiusRow).not.toHaveClass(/changed/);
  await expect.poll(async () => (await probe(frontFrame(page))).radius).toBe(dragged);

  await page.locator('.twk-title').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => readFileSync(indexPath, 'utf8')).toBe(htmlBefore);
  expect(readFileSync(tweaksPath, 'utf8')).toBe(tweaksBefore);
  await expect(radiusRow.locator('.twk-readout')).toHaveText('12px');
  await expect.poll(async () => (await probe(frontFrame(page))).radius).toBe('12px');
});
