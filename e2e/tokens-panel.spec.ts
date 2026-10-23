import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { differenceEuclidean, parse } from 'culori';
import type { Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { type StudioApi, frontFrame, mainDirection, openHome, sendPrompt, showVersions } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;
const FAR = '#00c853';
const FAR_2 = '#2962ff';
const COMMITTED = '#ff6d00';
const deltaE = differenceEuclidean('oklab');

async function openProject(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', {
    prompt: 'Tokens Panel Journal',
    kind: 'html',
    packId: 'editorial',
  });
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

async function plant(frame: FrameLocator): Promise<void> {
  await frame.locator('body').evaluate((body) => {
    const w = window as unknown as { __marker?: string };
    w.__marker = 'kept';
    if (document.getElementById('tk-probe')) return;
    const probe = document.createElement('p');
    probe.id = 'tk-probe';
    probe.textContent = 'probe';
    probe.style.color = 'var(--primary)';
    body.appendChild(probe);
  });
}

async function probe(frame: FrameLocator): Promise<{ color: string; marker: string | null; theme: string | null }> {
  return frame.locator('#tk-probe').evaluate((el) => ({
    color: getComputedStyle(el).color,
    marker: (window as unknown as { __marker?: string }).__marker ?? null,
    theme: document.documentElement.getAttribute('data-theme'),
  }));
}

function near(color: string, target: string): boolean {
  const a = parse(color);
  const b = parse(target);
  return Boolean(a && b) && deltaE(a!, b!) < 0.02;
}

async function expectColor(frame: FrameLocator, target: string): Promise<void> {
  await expect.poll(async () => near((await probe(frame)).color, target), { message: `probe colour should be ${target}` }).toBe(true);
}

async function shoot(page: Page, name: string, focus: Locator): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await focus.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(REVIEW_DIR, `tokens-panel-${name}-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(250);
}

test('tokens panel: live preview in every frame, theme, discard, commit, undo', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api);
  const main = mainDirection(project);
  const tokensJson = path.join(main.workTree, 'design-system', 'tokens.json');
  const tokensCss = path.join(main.workTree, 'design-system', 'tokens.css');
  await expect(frontFrame(page).locator('h1')).toHaveText('Tokens Panel Journal');

  await sendPrompt(page, 'Add a short note');
  await api.waitForRuns(project.id, 2);
  await expect(frontFrame(page).locator('.mock-edit')).toHaveCount(1);
  await expect(page.locator('li.version')).toHaveCount((await api.versions(project.id, main.id)).length);
  const jsonBefore = readFileSync(tokensJson, 'utf8');
  const cssBefore = readFileSync(tokensCss, 'utf8');

  const front = frontFrame(page);
  await plant(front);
  const original = (await probe(front)).color;
  expect(near(original, FAR)).toBe(false);

  await page.getByRole('tab', { name: /^Tokens/ }).click();
  const row = page.locator('li.tkp-row[data-token="--primary"]');
  const input = row.getByLabel('--primary value', { exact: true });
  await input.fill(FAR);
  await expectColor(front, FAR);
  expect((await probe(front)).marker).toBe('kept');
  await expect(row).toHaveClass(/changed/);
  await expect(page.getByRole('tab', { name: /^Tokens/ })).toContainText('1');
  await expect(page.locator('.tkp-count')).toHaveText('1 change');

  await input.fill('not-a-colour');
  await expect(row.locator('.tkp-error')).toBeVisible();
  await page.waitForTimeout(200);
  await expectColor(front, FAR);
  await input.fill(FAR);
  await expect(row.locator('.tkp-error')).toHaveCount(0);
  await expectColor(front, FAR);

  const space = page.locator('li.tkp-row[data-token^="--space-"]').first().locator('input');
  await space.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.tkp-count')).toHaveText('2 changes');
  await page.locator('.tkp-title').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.tkp-count')).toHaveText('1 change');
  await shoot(page, 'pending', row);

  await page.locator('.tkp-theme').getByRole('button', { name: 'Dark', exact: true }).click();
  await expect.poll(async () => (await probe(front)).theme).toBe('dark');
  expect((await probe(front)).marker).toBe('kept');
  await shoot(page, 'dark', row);
  await page.locator('.tkp-theme').getByRole('button', { name: 'Auto', exact: true }).click();
  await expect.poll(async () => (await probe(front)).theme).toBe(null);

  await showVersions(page);
  const rows = page.locator('li.version');
  await rows.nth(0).getByRole('button', { name: 'Compare' }).click();
  await rows.nth(1).getByRole('button', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(page.locator('.compare-pane')).toHaveCount(2);
  const panes = [page.frameLocator('.compare-pane:nth-child(1) iframe'), page.frameLocator('.compare-pane:nth-child(2) iframe')];
  for (const pane of panes) {
    await expect(pane.locator('h1')).toHaveText('Tokens Panel Journal');
    await plant(pane);
    await expectColor(pane, FAR);
  }
  await page.getByRole('tab', { name: 'Tokens' }).click();
  await input.fill(FAR_2);
  for (const pane of panes) {
    await expectColor(pane, FAR_2);
    expect((await probe(pane)).marker).toBe('kept');
  }
  await page.getByRole('button', { name: 'Close compare' }).click();
  await expect(front.locator('h1')).toBeVisible();
  await plant(front);
  await expectColor(front, FAR_2);

  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expectColor(front, original);
  expect((await probe(front)).marker).toBe('kept');
  await expect(page.locator('.tkp-footer')).toHaveCount(0);
  await expect(row).not.toHaveClass(/changed/);
  expect(readFileSync(tokensJson, 'utf8')).toBe(jsonBefore);

  const versionsBefore = (await api.versions(project.id, main.id)).length;
  await input.fill(COMMITTED);
  await expectColor(front, COMMITTED);
  await page.getByRole('button', { name: 'Commit', exact: true }).click();
  await expect(page.locator('.tkp-footer')).toHaveCount(0);
  await expect.poll(() => readFileSync(tokensJson, 'utf8')).toContain(COMMITTED);
  expect(readFileSync(tokensCss, 'utf8')).not.toBe(cssBefore);
  await expect.poll(async () => (await api.versions(project.id, main.id)).length).toBe(versionsBefore + 1);
  await expect(page.locator('li.version')).toHaveCount(versionsBefore + 1);
  await page.waitForTimeout(500);
  expect((await api.versions(project.id, main.id)).length).toBe(versionsBefore + 1);
  await expect(input).toHaveValue(COMMITTED);
  await plant(frontFrame(page));
  await expectColor(frontFrame(page), COMMITTED);

  await page.locator('.tkp-title').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => readFileSync(tokensJson, 'utf8')).toBe(jsonBefore);
  expect(readFileSync(tokensCss, 'utf8')).toBe(cssBefore);
  await expect(input).not.toHaveValue(COMMITTED);
});
