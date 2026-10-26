import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { formatHex, parse } from 'culori';
import type { CompiledTokenEntry, Project } from '../src/shared/contracts';
import { COLOR_EXACT_DELTA, COLOR_SNAP_DELTA, matchColor } from '../src/shared/token-match';
import { ROOT } from './support/server';
import { type StudioApi, frontFrame, mainDirection, openHome, selectInFrame } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');
const SIZES = [
  [1440, 900],
  [800, 934],
] as const;

async function openProject(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', {
    prompt: 'Token Snap Journal',
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

async function settledCount(page: Page, api: StudioApi, pid: string, did: string): Promise<number> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  const head = async () => (await api.project(pid)).directions.find((d) => d.id === did)?.headVersionId ?? null;
  const versions = await api.versions(pid, did);
  await expect.poll(head).toBe(versions[0]?.id ?? null);
  await expect(page.locator('li.version')).toHaveCount(versions.length);
  return versions.length;
}

async function shoot(page: Page, name: string, open: () => Promise<void>, close: () => Promise<void>): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    await open();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(REVIEW_DIR, `tokens-${name}-${width}x${height}.png`) });
    await close();
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(250);
}

function nearAccent(entries: CompiledTokenEntry[]): string {
  const accent = entries.find((entry) => entry.cssVar === '--accent');
  const base = accent ? parse(accent.value) : undefined;
  if (!base || base.mode !== 'oklch') throw new Error('accent token is not oklch');
  const hex = formatHex({ ...base, l: base.l - 0.012 });
  const best = matchColor(hex, entries)[0];
  expect(best?.cssVar).toBe('--accent');
  expect(best?.distance).toBeGreaterThan(COLOR_EXACT_DELTA);
  expect(best?.distance).toBeLessThan(COLOR_SNAP_DELTA);
  return hex;
}

test('token snap: picker, auto-snap, raw badge, create token with apply, undo', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api);
  const main = mainDirection(project);
  const indexFile = path.join(main.workTree, 'index.html');
  const tokensJson = path.join(main.workTree, 'design-system', 'tokens.json');
  const tokensCss = path.join(main.workTree, 'design-system', 'tokens.css');
  const state = await api.call<{ entries: CompiledTokenEntry[] }>('GET', `/api/projects/${project.id}/d/${main.id}/design-system`);
  await expect(frontFrame(page).locator('h1')).toHaveText('Token Snap Journal');

  await selectInFrame(page, 'h1');
  await expect(page.locator('.ins-tag')).toHaveText('h1');
  await expect(page.getByRole('region', { name: 'Token checks' })).toBeVisible();
  const snapToggle = page.getByRole('button', { name: 'Snap to tokens' });
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'true');
  const color = page.getByLabel('Text color', { exact: true });
  const pickerButton = page.getByRole('button', { name: 'Choose text color token' });
  await expect(pickerButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose font size token' })).toBeVisible();
  await expect(page.getByLabel('Font family', { exact: true })).toBeVisible();

  const picker = page.getByRole('listbox', { name: 'Text color tokens' });
  await shoot(
    page,
    'picker',
    async () => {
      await pickerButton.click();
      await expect(picker).toBeVisible();
      await page.keyboard.type('pri');
    },
    async () => {
      await page.keyboard.press('Escape');
      await expect(picker).toBeHidden();
    },
  );

  const start = await settledCount(page, api, project.id, main.id);
  await pickerButton.click();
  await picker.getByRole('option', { name: /--primary\b/ }).first().click();
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('color: var(--primary)');
  await expect(page.getByRole('button', { name: 'Text color: token --primary' })).toBeVisible();
  expect(await settledCount(page, api, project.id, main.id)).toBe(start + 1);

  const near = nearAccent(state.entries);
  await color.fill(near);
  await color.press('Enter');
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('color: var(--accent)');
  expect(readFileSync(indexFile, 'utf8')).not.toContain(near);
  await expect(page.locator('.tk-note')).toContainText('Snapped to --accent');
  await expect(page.getByRole('button', { name: 'Text color: token --accent' })).toBeVisible();

  const far = '#1d7a3a';
  await color.fill(far);
  await color.press('Enter');
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain(`color: ${far}`);
  const rawBadge = pickerButton;
  await expect(rawBadge).toHaveAccessibleDescription(/^Raw value/);
  const beforeCreate = await settledCount(page, api, project.id, main.id);
  const sourceRaw = readFileSync(indexFile, 'utf8');
  const tokensRaw = readFileSync(tokensJson, 'utf8');

  const menu = page.getByRole('menu', { name: 'Raw value' });
  await shoot(
    page,
    'raw-menu',
    async () => {
      await rawBadge.click();
      await expect(menu).toBeVisible();
    },
    async () => {
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    },
  );

  const dialog = page.getByRole('dialog', { name: 'Create token' });
  const openDialog = async () => {
    await rawBadge.click();
    await menu.getByRole('menuitem', { name: 'Create token…' }).click();
    await expect(dialog).toBeVisible();
  };
  await shoot(page, 'create-dialog', openDialog, async () => {
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  await openDialog();
  await expect(dialog.getByLabel('Group')).toHaveValue('color');
  await expect(dialog.getByLabel('Light value')).toHaveValue(far);
  await expect(dialog.getByLabel('Apply to this element')).toBeChecked();
  const name = dialog.getByLabel('Name');
  await name.fill('primary');
  await dialog.getByRole('button', { name: 'Create token' }).click();
  await expect(dialog).toContainText('--primary already exists');
  await name.fill('brand-2');
  await expect(dialog).toContainText('var(--brand-2)');
  await dialog.getByRole('button', { name: 'Create token' }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('color: var(--brand-2)');
  const created = JSON.parse(readFileSync(tokensJson, 'utf8')) as { color: Record<string, { $value?: string }> };
  expect(formatHex(created.color['brand-2']?.$value ?? '')).toBe(far);
  expect(readFileSync(tokensCss, 'utf8')).toContain('--brand-2');
  expect(await settledCount(page, api, project.id, main.id)).toBe(beforeCreate + 1);
  await expect(page.getByRole('button', { name: 'Text color: token --brand-2' })).toBeVisible();
  const h1Hex = async () => formatHex(parse(await frontFrame(page).locator('h1').evaluate((el) => getComputedStyle(el).color)) ?? '#000');
  await expect.poll(h1Hex).toBe(far);

  await page.locator('.ins-header .ins-tag').click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toBe(sourceRaw);
  expect(readFileSync(tokensJson, 'utf8')).toBe(tokensRaw);
  expect(readFileSync(tokensJson, 'utf8')).not.toContain('brand-2');
  expect(readFileSync(tokensCss, 'utf8')).not.toContain('--brand-2');
});
