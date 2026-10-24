import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import type { Project } from '../src/shared/contracts';
import { BASE_URL } from './support/server';
import { type StudioApi, mainDirection, openHome, showVersions } from './support/studio';

const PROMPT = 'A landing page for a small independent bookshop: hero, featured books, events calendar, newsletter signup';
const SHORT = 'A landing page for a small independent bookshop';
const BUTTONS = [
  { id: 'b1', x: 80, y: 120 },
  { id: 'b2', x: 320, y: 120 },
  { id: 'b3', x: 560, y: 120 },
];
const BUTTON_SIZE = { width: 160, height: 48 };
const TOLERANCE = 2;

function fixture(changedBg: string): string {
  const places = BUTTONS.map((b) => `#${b.id}{left:${b.x}px;top:${b.y}px}`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#ffffff}
button{position:absolute;width:${BUTTON_SIZE.width}px;height:${BUTTON_SIZE.height}px;margin:0;padding:0;border:0;border-radius:8px;background:#2a4bd7;color:#ffffff;font:600 16px/48px sans-serif}
${places}#b2{background:${changedBg}}
</style></head><body><button id="b1">One</button><button id="b2">Two</button><button id="b3">Three</button></body></html>`;
}

function trackThumbs(page: Page): { count: () => number } {
  let count = 0;
  page.on('request', (request) => {
    if (/\/versions\/[^/]+\/thumb$/.test(new URL(request.url()).pathname)) count += 1;
  });
  return { count: () => count };
}

async function seedRunProject(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: PROMPT, kind: 'html', packId: 'editorial' });
  await api.waitForRuns(project.id, 1);
  await api.call('POST', `/api/projects/${project.id}/d/${mainDirection(project).id}/design-system/tokens/update`, { changes: [{ path: 'color.primary', value: '#7a3b1f' }] });
  await page.evaluate((id) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: id })), project.id);
  return project;
}

test('R7-1: rows show lazy thumbnails, a hidden panel fetches none, and a rename is there after reload', async ({ page }) => {
  const thumbs = trackThumbs(page);
  const api = await openHome(page);
  const project = await seedRunProject(page, api);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
  writeFileSync(path.join(mainDirection(project).workTree, 'notes.txt'), 'a file change while the panel is hidden\n');
  await page.waitForTimeout(1500);
  expect(thumbs.count()).toBe(0);

  await showVersions(page);
  const rows = page.locator('li.version');
  await expect(rows).toHaveCount(3);
  const thumbsInRows = rows.locator('[data-testid="version-thumb"]');
  await expect(thumbsInRows).toHaveCount(3);
  for (const box of await thumbsInRows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) expect([box.width, box.height]).toEqual([56, 35]);
  await expect.poll(async () => thumbsInRows.evaluateAll((els) => els.map((el) => el.getAttribute('data-state'))), { timeout: 60_000 }).toEqual(['ready', 'ready', 'none']);
  for (const box of await thumbsInRows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) expect([box.width, box.height]).toEqual([56, 35]);
  const natural = await rows.first().locator('img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(natural).toEqual([640, 400]);
  const fetched = thumbs.count();
  expect(fetched).toBeLessThanOrEqual(3);

  const runRow = rows.filter({ has: page.locator('.version-kind', { hasText: 'Run' }) });
  const title = runRow.locator('.version-toggle');
  await expect(title).toHaveText(SHORT);
  await title.dblclick();
  const field = runRow.getByRole('textbox', { name: 'Version name' });
  await expect(field).toBeFocused();
  await field.fill('Zoom fit hero v2');
  await page.keyboard.press('Escape');
  await expect(title).toHaveText(SHORT);
  await expect(page.locator('.studio')).toBeVisible();

  await title.dblclick();
  await field.fill('');
  await page.keyboard.type('Zoom fit hero v2');
  await expect(field).toHaveValue('Zoom fit hero v2');
  await page.keyboard.press('Enter');
  await expect(title).toHaveText('Zoom fit hero v2');
  await expect(title).toBeFocused();
  await expect.poll(async () => (await api.versions(project.id, 'main')).find((v) => v.meta.kind === 'run')?.name).toBe('Zoom fit hero v2');

  const tokensRow = rows.filter({ has: page.locator('.version-kind', { hasText: 'Tokens' }) });
  await tokensRow.locator('.version-toggle').focus();
  await page.keyboard.press('F2');
  await tokensRow.getByRole('textbox', { name: 'Version name' }).fill('Warmer brown');
  await page.locator('#versions-heading').click();
  await expect(tokensRow.locator('.version-toggle')).toHaveText('Warmer brown');

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Versions' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('li.version .version-toggle')).toHaveText(['Warmer brown', 'Zoom fit hero v2', 'Apply Editorial design system']);

  const named = page.locator('li.version').filter({ hasText: 'Zoom fit hero v2' }).locator('.version-toggle');
  await named.dblclick();
  await page.getByRole('textbox', { name: 'Version name' }).fill('   ');
  await page.keyboard.press('Enter');
  await expect(page.locator('li.version .version-toggle').nth(1)).toHaveText(SHORT);
  await expect.poll(async () => (await api.versions(project.id, 'main')).find((v) => v.meta.kind === 'run')?.name).toBeUndefined();

  await page.getByRole('tab', { name: 'Chat' }).click();
  const before = thumbs.count();
  writeFileSync(path.join(mainDirection(project).workTree, 'notes.txt'), 'another hidden change\n');
  await api.call('POST', `/api/projects/${project.id}/d/main/keep`);
  await expect.poll(async () => (await api.versions(project.id, 'main')).length).toBe(4);
  await expect(page.locator('li.version')).toHaveCount(4);
  await page.waitForTimeout(1500);
  expect(thumbs.count()).toBe(before);
});

test('R7-2: the diff mask marks only the changed button; slider and overlay modes work', async ({ page }) => {
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects/from-starter', { starterId: 'form' });
  const main = mainDirection(project);
  const file = path.join(main.workTree, project.entry || 'index.html');
  writeFileSync(file, fixture('#2a4bd7'));
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/keep`);
  writeFileSync(file, fixture('#d7442a'));
  await api.call('POST', `/api/projects/${project.id}/d/${main.id}/keep`);
  const [after, before] = await api.versions(project.id, main.id);
  if (!after || !before) throw new Error('expected two kept versions');

  const res = await fetch(`${BASE_URL}/api/projects/${project.id}/versions/${before.id}/diff/${after.id}?w=1280&h=800`, { headers: { 'x-studio-token': api.token } });
  expect(res.status).toBe(200);
  const mask = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
  expect([mask.width, mask.height]).toEqual([1280, 800]);
  const target = BUTTONS[1] as (typeof BUTTONS)[number];
  let inside = 0;
  const outside: [number, number][] = [];
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if ((mask.data[(y * mask.width + x) * 4 + 3] ?? 0) === 0) continue;
      const within = x >= target.x - TOLERANCE && x < target.x + BUTTON_SIZE.width + TOLERANCE && y >= target.y - TOLERANCE && y < target.y + BUTTON_SIZE.height + TOLERANCE;
      if (within) inside += 1;
      else outside.push([x, y]);
    }
  }
  expect(outside.slice(0, 5)).toEqual([]);
  expect(inside).toBeGreaterThan(BUTTON_SIZE.width * BUTTON_SIZE.height * 0.6);
  expect((await fetch(`${BASE_URL}/api/projects/${project.id}/versions/${before.id}/diff/${after.id}`)).status).toBe(403);

  await page.evaluate((id) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: id })), project.id);
  await page.reload();
  await showVersions(page);
  const rows = page.locator('li.version');
  await expect(rows).toHaveCount(3);
  for (const index of [0, 1]) {
    await rows.nth(index).hover();
    await rows.nth(index).getByRole('button', { name: 'Compare' }).click();
  }
  await page.getByRole('button', { name: 'Compare', exact: true }).first().click();
  await expect(page.locator('.compare-pane')).toHaveCount(2);

  await page.getByRole('radio', { name: 'Slider' }).click();
  const handle = page.getByRole('slider', { name: 'Compare position' });
  await expect(handle).toHaveAttribute('aria-valuenow', '50');
  const hit = await handle.boundingBox();
  expect(hit?.width ?? 0).toBeGreaterThanOrEqual(28);
  await handle.focus();
  for (let n = 0; n < 5; n += 1) await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '60');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '50');
  const board = await page.getByTestId('compare-slider').boundingBox();
  if (!board) throw new Error('no slider board');
  await page.mouse.move(board.x + board.width * 0.5, board.y + board.height / 2);
  await page.mouse.down();
  await page.mouse.move(board.x + board.width * 0.25, board.y + board.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByTestId('compare-slider-top')).toHaveAttribute('style', /inset\(0px 0px 0px 25%\)|inset\(0 0 0 25%\)/);
  await expect(page.locator('[data-testid="compare-slider"] iframe')).toHaveCount(2);

  await page.getByRole('radio', { name: 'Overlay' }).click();
  await expect(page.getByTestId('compare-changed')).toContainText('% of pixels changed', { timeout: 60_000 });
  const overlay = page.getByTestId('compare-mask');
  await expect(overlay).toBeVisible();
  await expect.poll(() => overlay.evaluate((img) => getComputedStyle(img).opacity)).toBe('0.7');
  await page.getByRole('checkbox', { name: 'Show changes' }).uncheck();
  await expect.poll(() => overlay.evaluate((img) => getComputedStyle(img).opacity)).toBe('0');
});
