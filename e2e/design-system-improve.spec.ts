import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { DesignSystemCoverage, PackSummary, Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { type StudioApi, mainDirection, openHome } from './support/studio';

const DTCG = path.join(ROOT, 'src', 'server', 'design-system', 'extract', '__fixtures__', 'dtcg.tokens.json');

async function createDtcgDraft(page: Page, api: StudioApi, name: string): Promise<Project> {
  const before = new Set((await api.projects()).map((project) => project.id));
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  await page.getByRole('button', { name: 'New design system…' }).click();
  await expect(page.getByRole('heading', { name: 'New design system' })).toBeVisible();
  await page.getByLabel('Design system name').fill(name);
  await page.getByLabel('Tokens file upload').setInputFiles(DTCG);
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByRole('region', { name: 'Design system draft' })).toContainText(name);
  const project = (await api.projects()).find((item) => !before.has(item.id));
  if (!project) throw new Error('backing project not found');
  return project;
}

async function improve(page: Page, focus: string): Promise<void> {
  const bar = page.getByRole('region', { name: 'Design system draft' });
  await bar.getByLabel('What should the AI focus on?').fill(focus);
  await bar.getByRole('button', { name: 'Improve with AI' }).click();
}

async function packOf(api: StudioApi, id: string): Promise<PackSummary | undefined> {
  return (await api.call<PackSummary[]>('GET', '/api/packs')).find((pack) => pack.id === id);
}

async function pickerOptions(page: Page): Promise<string[]> {
  await page.locator('.topbar').getByRole('button', { name: 'Projects' }).click();
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  const list = page.getByRole('listbox', { name: 'Design systems' });
  await expect(list.getByRole('option').first()).toBeVisible();
  return list.getByRole('option').allTextContents();
}

test('improve with AI: a DTCG draft passes the check, then Save to library puts it in the picker', async ({ page }) => {
  const api = await openHome(page);
  const project = await createDtcgDraft(page, api, 'Harbor Kit');
  const packId = project.designSystemFor as string;
  expect(await packOf(api, packId)).toMatchObject({ draft: true });

  const bar = page.getByRole('region', { name: 'Design system draft' });
  await bar.getByRole('button', { name: /^\d+ problems?$/ }).click();
  await expect(bar.getByRole('region', { name: 'Design system check problems' })).toContainText('still has a to-do line');
  await expect(bar.getByRole('button', { name: 'Save to library' })).not.toHaveClass(/primary/);

  await improve(page, 'Calm, quiet neutrals');
  const [run] = await api.waitForRuns(project.id, 1);
  expect(run).toMatchObject({ status: 'completed', request: { task: 'design-system' }, designSystemCheck: { passed: true, rounds: 0 } });
  expect(run?.request.prompt).toBe('Improve this design system.\n\nFocus: Calm, quiet neutrals');
  await expect(bar.locator('.draft-check.passed')).toHaveText('Check passed');
  await expect(bar.getByRole('button', { name: 'Save to library' })).toHaveClass(/primary/);
  const tree = mainDirection(project).workTree;
  expect(readFileSync(path.join(tree, 'DESIGN.md'), 'utf8')).not.toMatch(/^_To do:/m);
  const coverage = JSON.parse(readFileSync(path.join(tree, 'source', 'coverage.json'), 'utf8')) as DesignSystemCoverage;
  expect(coverage.version).toBe(1);

  await bar.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.locator('.ds-toast', { hasText: 'Saved Harbor Kit to your library.' })).toBeVisible();
  expect((await packOf(api, packId))?.draft).toBeUndefined();
  const detail = await api.call<{ designMd: string }>('GET', `/api/packs/${packId}`);
  expect(detail.designMd).not.toMatch(/^_To do:/m);

  const options = await pickerOptions(page);
  expect(options.some((text) => text.includes('Harbor Kit') && text.includes('Yours'))).toBe(true);
});

test('improve with AI: the studio sends the agent back when the check fails, and an unsaved draft stays out of the picker', async ({ page }) => {
  const api = await openHome(page);
  const project = await createDtcgDraft(page, api, 'Ember Kit');
  await improve(page, 'Warmer accents [ds-fail-once]');
  const [run] = await api.waitForRuns(project.id, 1);
  expect(run).toMatchObject({ status: 'completed', designSystemCheck: { passed: true, rounds: 1 } });
  expect(run?.finalText).toContain('Design system check: passed after 1 studio fix round(s).');
  const detail = await api.call<{ sent: Array<{ text: string; continuation?: number }> }>('GET', `/api/runs/${run?.id}`);
  expect(detail.sent.map((item) => item.continuation ?? 0)).toEqual([0, 1]);
  expect(detail.sent[1]?.text).toContain('[design-md] DESIGN.md still has a to-do line');
  const bar = page.getByRole('region', { name: 'Design system draft' });
  await expect(bar.locator('.draft-check.passed')).toHaveText('Check passed');

  const options = await pickerOptions(page);
  expect(options.some((text) => text.includes('Ember Kit'))).toBe(false);
  expect(await packOf(api, project.designSystemFor as string)).toMatchObject({ draft: true });
});
