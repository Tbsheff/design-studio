import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { PackSummary, Project } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { type StudioApi, createProjectViaUi, frontFrame, mainDirection, openHome } from './support/studio';

const FIXTURES = path.join(ROOT, 'src', 'server', 'design-system', 'extract', '__fixtures__');

let site: http.Server;
let siteUrl: string;

test.beforeAll(async () => {
  site = http.createServer((req, res) => {
    const name = path.basename((req.url ?? '/') === '/' ? 'index.html' : (req.url ?? ''));
    readFile(path.join(FIXTURES, 'site', name))
      .then((body) => res.writeHead(200, { 'content-type': name.endsWith('.css') ? 'text/css' : 'text/html' }).end(body))
      .catch(() => res.writeHead(404).end());
  });
  await new Promise<void>((resolve) => site.listen(0, '127.0.0.1', resolve));
  siteUrl = `http://127.0.0.1:${(site.address() as AddressInfo).port}/`;
});

test.afterAll(async () => {
  await new Promise((resolve) => site.close(resolve));
});

async function openNewPage(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  await page.getByRole('button', { name: 'New design system…' }).click();
  await expect(page.getByRole('heading', { name: 'New design system' })).toBeVisible();
}

async function rgbOf(locator: Locator): Promise<number[]> {
  return locator.evaluate((element) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) return [];
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  });
}

function expectRgb(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => expect(Math.abs(value - (expected[index] ?? -999)), `channel ${index} of ${actual.join(',')}`).toBeLessThanOrEqual(3));
}

const chip = (page: Page, token: string) => frontFrame(page).locator(`[data-palette="light"] [data-token="${token}"] .chip`);

async function createdProject(api: StudioApi, before: Set<string>): Promise<Project> {
  const created = (await api.projects()).find((project) => !before.has(project.id));
  if (!created) throw new Error('backing project not found');
  return created;
}

test('new design system: website + DESIGN.md draft, kit page, save back, then use it in a new project', async ({ page }) => {
  test.skip(Boolean(process.env.STUDIO_E2E_APP), 'the packaged app never allows a loopback fetch');
  const api = await openHome(page);
  const before = new Set((await api.projects()).map((project) => project.id));
  await openNewPage(page);
  await page.getByLabel('Design system name').fill('Rocket Kit');
  await page.getByLabel('Website 1').fill(siteUrl);
  await page.getByRole('textbox', { name: 'DESIGN.md', exact: true }).fill('# Rocket Kit\n\n## Visual Theme & Atmosphere\n\nLoud, warm and fast.\n');
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByLabel('DESIGN.md preview').getByRole('heading', { name: 'Rocket Kit' })).toBeVisible();
  await page.getByRole('button', { name: 'Create draft' }).click();

  const bar = page.getByRole('region', { name: 'Design system draft' });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Rocket Kit');
  await expect(bar.locator('.draft-grade')).toContainText('/100');
  await expect(page.locator('.topbar')).toContainText('Rocket Kit design system');
  const project = await createdProject(api, before);
  expect(project).toMatchObject({ designSystemFor: 'user-rocket-kit', packId: 'user-rocket-kit' });
  await expect.poll(async () => rgbOf(chip(page, 'accent'))).toHaveLength(3);
  expectRgb(await rgbOf(chip(page, 'accent')), [232, 89, 12]);
  expectRgb(await rgbOf(chip(page, 'primary')), [31, 111, 235]);
  const tree = mainDirection(project).workTree;
  expect(readFileSync(path.join(tree, 'source', 'evidence.md'), 'utf8')).toContain('Untrusted data');

  await api.call('POST', `/api/projects/${project.id}/d/main/design-system/tokens/update`, { changes: [{ path: 'color.primary', value: 'oklch(52% 0.2 300)' }] });
  await bar.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.locator('.ds-toast', { hasText: 'Saved Rocket Kit to your library.' })).toBeVisible();
  const users = (await api.call<PackSummary[]>('GET', '/api/packs')).filter((pack) => pack.source === 'user').map((pack) => pack.id);
  expect(users.filter((id) => id.startsWith('user-rocket-kit'))).toEqual(['user-rocket-kit']);
  const detail = await api.call<{ tokensJson: string }>('GET', '/api/packs/user-rocket-kit');
  expect(detail.tokensJson).toContain('oklch(52% 0.2 300)');

  await page.locator('.topbar').getByRole('button', { name: 'Projects' }).click();
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await page.getByRole('button', { name: 'Design system', exact: true }).click();
  const list = page.getByRole('listbox', { name: 'Design systems' });
  const option = list.getByRole('option', { name: 'Rocket Kit', exact: true });
  await expect(option).toContainText('Yours');
  await option.click();
  const used = await createProjectViaUi(page, api, 'Rocket launch page', 'html');
  expect(used.packId).toBe('user-rocket-kit');
  await expect.poll(() => readFileSync(path.join(mainDirection(used).workTree, 'design-system', 'tokens.json'), 'utf8')).toContain('oklch(52% 0.2 300)');
});

test('new design system: draft from a DTCG tokens file only', async ({ page }) => {
  const api = await openHome(page);
  const before = new Set((await api.projects()).map((project) => project.id));
  await openNewPage(page);
  await expect(page.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  await page.getByLabel('Tokens file upload').setInputFiles(path.join(FIXTURES, 'dtcg.tokens.json'));
  await expect(page.locator('.nds-drop')).toContainText('dtcg.tokens.json');
  await page.getByRole('button', { name: 'Create draft' }).click();

  const bar = page.getByRole('region', { name: 'Design system draft' });
  await expect(bar).toContainText('Dtcg');
  const project = await createdProject(api, before);
  expect(project.designSystemFor).toMatch(/^user-dtcg/);
  const pack = (await api.call<PackSummary[]>('GET', '/api/packs')).find((item) => item.id === project.designSystemFor);
  expect(pack).toMatchObject({ source: 'user', provenance: 'imported' });
  await expect.poll(async () => rgbOf(chip(page, 'primary'))).toHaveLength(3);
  expectRgb(await rgbOf(chip(page, 'primary')), [10, 125, 90]);
  const versions = await api.versions(project.id, 'main');
  expect(versions.map((version) => version.title)).toEqual([`Apply ${pack?.name} design system`]);
});
