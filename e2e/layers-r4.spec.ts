import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, type StudioApi } from './support/studio';

const PAGE = `<!doctype html>
<html>
<head><style>
body { margin: 0; font: 16px system-ui; }
main { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: 40px; }
.card { width: 300px; padding: 16px; background: #e5e7eb; }
</style></head>
<body>
  <main>
    <h2>Section title</h2>
    <article class="card" id="c1">Card one</article>
    <article class="card" id="c2">Card two</article>
    <article class="card" id="c3">Card three</article>
  </main>
  <section id="promo" style="padding:8px"><p>Promo</p></section>
</body>
</html>
`;

const APP = `export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 48 }}>
      <article className="card" id="c1">Card one</article>
      <article className="card" id="c2">Card two</article>
      <article className="card" id="c3">Card three</article>
    </main>
  );
}
`;

function order(source: string): string[] {
  return [...source.matchAll(/id="(c\d)"/g)].map((m) => m[1] ?? '');
}

async function htmlProject(page: Page, title: string): Promise<{ api: StudioApi; file: string; pid: string; did: string }> {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, title, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(title);
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  writeFileSync(file, PAGE);
  await expect(frontFrame(page).locator('#c1')).toHaveText('Card one');
  await keepFixture(page);
  await expect(page.locator('iframe.frame.back')).toHaveCount(0);
  return { api, file, pid: project.id, did: main.id };
}

async function keepFixture(page: Page): Promise<void> {
  const banner = page.locator('.banner', { hasText: 'Unfinished changes' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(banner).toHaveCount(0);
}

async function focusStudio(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
}

async function focusPreview(page: Page): Promise<void> {
  const frame = await (await page.locator('iframe.frame.front').elementHandle())?.contentFrame();
  if (!frame) throw new Error('no preview frame');
  await frame.evaluate(() => window.focus());
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
}

async function layersSettled(page: Page): Promise<void> {
  await expect(page.locator('.layers-list')).toHaveAttribute('aria-busy', 'false');
}

async function versionCount(api: StudioApi, pid: string, did: string): Promise<number> {
  return (await api.versions(pid, did)).length;
}

async function latestTitle(api: StudioApi, pid: string, did: string): Promise<string> {
  return (await api.versions(pid, did))[0]?.title ?? '';
}

test('R4-4: a 40 px handle drag at 50% zoom changes the width field and the file by 40 px', async ({ page }) => {
  const { api, file, pid, did } = await htmlProject(page, 'Resize Handles Page');
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.5');
  await expect.poll(() => page.locator('.artboard').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(0.5);
  await selectInFrame(page, '#c1');
  const width = page.getByLabel('Width', { exact: true });
  await expect(width).toHaveValue(/^300(px)?$/);
  const before = await versionCount(api, pid, did);

  const handle = page.locator('.resize-handle.e');
  await expect(handle).toHaveCSS('cursor', 'ew-resize');
  await expect(page.locator('.resize-handle.s')).toHaveCSS('cursor', 'ns-resize');
  await expect(page.locator('.resize-handle.se')).toHaveCSS('cursor', 'nwse-resize');
  const box = await handle.boundingBox();
  if (!box) throw new Error('no handle');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y, { steps: 4 });
  await page.mouse.move(x + 20, y, { steps: 4 });
  await expect(page.getByTestId('resize-label')).toHaveText(/^340 × \d+$/);
  await expect(page.getByTestId('resize-label')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(frontFrame(page).locator('#c1')).toHaveCSS('width', '340px');
  expect(await versionCount(api, pid, did)).toBe(before);
  await page.mouse.up();

  await expect.poll(() => readFileSync(file, 'utf8')).toContain('<article style="width: 340px;" class="card" id="c1">');
  expect(readFileSync(file, 'utf8')).toBe(PAGE.replace('<article class="card" id="c1">', '<article style="width: 340px;" class="card" id="c1">'));
  await expect(width).toHaveValue(/^340(px)?$/);
  await expect.poll(() => versionCount(api, pid, did)).toBe(before + 1);
  await expect(page.getByTestId('resize-label')).toHaveCount(0);
});

test('R4-9: Alt+Down moves a card in the HTML source, twice, and the selection follows it', async ({ page }) => {
  const { api, file, pid, did } = await htmlProject(page, 'Reorder Keys Page');
  await selectInFrame(page, '#c1');
  const before = await versionCount(api, pid, did);

  await focusStudio(page);
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => order(readFileSync(file, 'utf8'))).toEqual(['c2', 'c1', 'c3']);
  const once = readFileSync(file, 'utf8');
  expect(once).toBe(PAGE.replace('<article class="card" id="c1">Card one</article>\n    <article class="card" id="c2">Card two</article>', '<article class="card" id="c2">Card two</article>\n    <article class="card" id="c1">Card one</article>'));
  await expect(frontFrame(page).locator('main > article').nth(1)).toHaveText('Card one');
  await expect(page.getByLabel('Text content')).toHaveValue('Card one');
  await expect.poll(() => latestTitle(api, pid, did)).toBe('Move article down');
  await expect(page.locator('.ins-source')).toHaveText('index.html:12');

  await focusPreview(page);
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => order(readFileSync(file, 'utf8'))).toEqual(['c2', 'c3', 'c1']);
  await expect(page.locator('.ins-source')).toHaveText('index.html:13');
  await expect(page.getByLabel('Text content')).toHaveValue('Card one');
  await expect.poll(() => versionCount(api, pid, did)).toBe(before + 2);

  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator('.edit-notice')).toHaveText('This element is already last among its siblings');
  expect(order(readFileSync(file, 'utf8'))).toEqual(['c2', 'c3', 'c1']);

  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.locator('.layers-row.selected')).toContainText('#c1');
  await page.locator('.layers-list').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(() => order(readFileSync(file, 'utf8'))).toEqual(['c2', 'c1', 'c3']);
  await expect(page.locator('.layers-row.selected')).toContainText('#c1');
  await expect.poll(() => versionCount(api, pid, did)).toBe(before + 3);
});

test('R4-9: Alt+Down moves a literal card in a TSX file', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Reorder Tsx', 'react');
  await expect(frontFrame(page).locator('h1')).toHaveText('Reorder Tsx', { timeout: 90_000 });
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'src', 'App.tsx');
  writeFileSync(file, APP);
  await expect(frontFrame(page).locator('#c1')).toHaveText('Card one');
  await keepFixture(page);
  await selectInFrame(page, '#c1');
  await expect(page.locator('.ins-source')).toContainText('App.tsx');

  await focusPreview(page);
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => readFileSync(file, 'utf8')).toBe(
    APP.replace(
      '<article className="card" id="c1">Card one</article>\n      <article className="card" id="c2">Card two</article>',
      '<article className="card" id="c2">Card two</article>\n      <article className="card" id="c1">Card one</article>',
    ),
  );
  await expect(frontFrame(page).locator('main > article').nth(1)).toHaveText('Card one');
  await expect(page.locator('.ins-source')).toHaveText('src/App.tsx:5');
  await focusStudio(page);
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => order(readFileSync(file, 'utf8'))).toEqual(['c2', 'c3', 'c1']);
  await expect(page.getByLabel('Text content')).toHaveValue('Card one');
});

test('R4-4: Enter on a layers row selects the first child, Shift+Enter the parent, F2 renames', async ({ page }) => {
  const { file } = await htmlProject(page, 'Layers Keys Page');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const tree = page.getByRole('tree', { name: 'Layers' });
  const promo = page.locator('.layers-row', { hasText: '#promo' });
  await promo.click();
  await expect(promo).toHaveAttribute('aria-selected', 'true');
  await expect(tree).toBeFocused();
  await page.keyboard.press('Enter');
  const child = page.locator('.layers-row', { hasText: 'Promo' }).filter({ hasNotText: '#promo' });
  await expect(child).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ins-tag')).toHaveText('p');
  await expect(page.getByLabel('Layer name')).toHaveCount(0);
  await page.keyboard.press('Shift+Enter');
  await expect(promo).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ins-tag')).toHaveText('section');
  const before = readFileSync(file, 'utf8');
  await page.keyboard.press('F2');
  const input = page.getByLabel('Layer name');
  await expect(input).toBeFocused();
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  expect(readFileSync(file, 'utf8')).toBe(before);
});

test('R4-4: rename writes data-name, hide and show restore the bytes, drag reorders once', async ({ page }) => {
  const { api, file, pid, did } = await htmlProject(page, 'Layers Edit Page');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const titleRow = page.locator('.layers-row', { hasText: 'Section title' });
  await titleRow.dblclick();
  const input = page.getByLabel('Layer name');
  await expect(input).toBeFocused();
  await input.fill('Hero title');
  await input.press('Enter');
  await expect.poll(() => readFileSync(file, 'utf8')).toContain('<h2 data-name="Hero title">Section title</h2>');
  await expect.poll(() => latestTitle(api, pid, did)).toBe('Rename h2 to Hero title');
  await layersSettled(page);
  await expect(frontFrame(page).locator('h2[data-name="Hero title"]')).toHaveCount(1);
  await expect(page.locator('.layers-row', { hasText: 'Hero title' })).toHaveCount(1);
  const beforeHide = readFileSync(file, 'utf8');
  const promo = page.locator('.layers-row', { hasText: '#promo' });
  await promo.hover();
  await promo.getByRole('button', { name: 'Hide' }).click();
  await expect.poll(() => readFileSync(file, 'utf8')).toContain('<section id="promo" style="display: none; padding:8px">');
  await expect(frontFrame(page).locator('#promo')).toBeHidden();
  await expect(promo).toHaveClass(/is-hidden/);
  await expect.poll(() => latestTitle(api, pid, did)).toBe('Hide section');
  await layersSettled(page);
  await promo.getByRole('button', { name: 'Show' }).click();
  await expect.poll(() => readFileSync(file, 'utf8')).toBe(beforeHide);
  await expect(frontFrame(page).locator('#promo')).toBeVisible();
  await expect(promo).not.toHaveClass(/is-hidden/);

  await layersSettled(page);
  const before = await versionCount(api, pid, did);
  const c3 = page.locator('.layers-row', { hasText: '#c3' });
  const c2 = page.locator('.layers-row', { hasText: '#c2' });
  const from = await c3.boundingBox();
  const to = await c2.boundingBox();
  if (!from || !to) throw new Error('no rows');
  await page.mouse.move(from.x + 40, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + from.height / 2 - 8, { steps: 3 });
  await page.mouse.move(from.x + 40, to.y + to.height / 2, { steps: 5 });
  await expect(page.getByTestId('layers-drop')).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => order(readFileSync(file, 'utf8'))).toEqual(['c1', 'c3', 'c2']);
  await expect.poll(() => versionCount(api, pid, did)).toBe(before + 1);
  await expect(page.getByTestId('layers-drop')).toHaveCount(0);
});
