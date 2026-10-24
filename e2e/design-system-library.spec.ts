import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { PackSummary, Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, mainDirection, openHome, showVersions, versionRow } from './support/studio';

async function openProject(page: Page, api: StudioApi, body: Record<string, unknown>): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { kind: 'html', ...body });
  if (body.startRun !== false) await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  return api.project(project.id);
}

function chip(page: Page, name: string) {
  return page.locator('.topbar').getByRole('button', { name: `Design system: ${name}` });
}

async function previewPrimary(page: Page): Promise<string> {
  return frontFrame(page)
    .locator('body')
    .evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
}

test('design-system library: save to library, switch packs, restore through versions', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, { prompt: 'Library Journal', packId: 'editorial', designMd: 'Keep these notes.' });
  const tree = mainDirection(project).workTree;
  const editorialCss = readFileSync(path.join(tree, 'design-system/tokens.css'), 'utf8');
  await expect.poll(() => previewPrimary(page)).not.toBe('');
  const editorialPrimary = await previewPrimary(page);

  await chip(page, 'Editorial').click();
  await page.getByRole('dialog', { name: 'Design system' }).getByRole('button', { name: 'Save to library…' }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Save to library' });
  await saveDialog.getByLabel('Design system name').fill('House Editorial');
  await saveDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(saveDialog).toBeHidden();
  await expect(page.locator('.ds-toast', { hasText: 'Saved House Editorial to your library.' })).toBeVisible();
  const packs = await api.call<PackSummary[]>('GET', '/api/packs');
  expect(packs.at(-1)).toMatchObject({ id: 'user-house-editorial', source: 'user', provenance: 'extracted' });

  await chip(page, 'Editorial').click();
  await page.getByRole('dialog', { name: 'Design system' }).getByRole('button', { name: 'Change design system…' }).click();
  const change = page.getByRole('dialog', { name: 'Change design system' });
  const list = change.getByRole('listbox', { name: 'Design systems' });
  await expect(list.getByRole('option', { name: 'House Editorial' })).toContainText('Yours');
  await expect(list.getByRole('option', { name: 'No design system' })).toHaveCount(0);
  await list.getByRole('option', { name: 'Brutalist', exact: true }).click();
  await expect(change).toBeHidden();
  await expect(page.locator('.ds-toast', { hasText: 'Switch to Brutalist design system.' })).toBeVisible();
  await expect(chip(page, 'Brutalist')).toBeVisible();
  await expect.poll(() => previewPrimary(page)).not.toBe(editorialPrimary);
  expect(readFileSync(path.join(tree, 'design-system/tokens.css'), 'utf8')).not.toBe(editorialCss);
  expect(readFileSync(path.join(tree, 'DESIGN.md'), 'utf8')).toContain('## Project notes\n\nKeep these notes.');

  await showVersions(page);
  await expect(versionRow(page, 'Switch to Brutalist design system')).toHaveCount(1);
  const versions = await api.versions(project.id, 'main');
  const before = versions[1];
  if (!before) throw new Error('no version before the switch');
  await versionRow(page, before.title).first().getByRole('button', { name: 'Restore' }).click();
  await expect(chip(page, 'Editorial')).toBeVisible();
  await expect.poll(() => previewPrimary(page)).toBe(editorialPrimary);
  expect(readFileSync(path.join(tree, 'design-system/tokens.css'), 'utf8')).toBe(editorialCss);
  await expect.poll(async () => (await api.project(project.id)).packId).toBe('editorial');
});

test('design-system library: add a design system to a project without one', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, { prompt: 'Plain Library Page', startRun: false });
  const tree = mainDirection(project).workTree;
  await expect(page.locator('.topbar .ds-chip')).toHaveCount(0);
  await page.locator('.topbar').getByRole('button', { name: 'Add design system' }).click();
  const add = page.getByRole('dialog', { name: 'Add design system' });
  await add.getByRole('listbox', { name: 'Design systems' }).getByRole('option', { name: 'Editorial', exact: true }).click();
  await expect(add).toBeHidden();
  await expect(chip(page, 'Editorial')).toBeVisible();
  await expect(page.locator('.ds-toast', { hasText: 'Apply Editorial design system.' })).toBeVisible();
  for (const file of ['design-system/tokens.json', 'design-system/pack.json', 'design-system/tokens.css', 'DESIGN.md']) {
    expect(existsSync(path.join(tree, file)), file).toBe(true);
  }
  expect((await api.project(project.id)).packId).toBe('editorial');
});
