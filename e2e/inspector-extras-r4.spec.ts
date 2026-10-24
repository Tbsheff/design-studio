import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL } from './support/server';
import { createProjectViaUi, frontFrame, openHome, selectInFrame, setSelectMode } from './support/studio';

const PAGE = `<!doctype html>
<html>
<head>
<title>Extras</title>
<link rel="stylesheet" href="extras.css">
<style>
.card { padding: 24px; }
@media (max-width: 1px) { .card { color: red; } }
</style>
</head>
<body>
<main class="shell"><section class="wrap"><div class="row"><div class="col"><article class="card" style="mix-blend-mode: multiply; opacity: 0.9">
<h1 class="title">Extras Page</h1>
</article></div></div></section></main>
</body>
</html>
`;
const SHEET = '.card { transform: rotate(2deg); filter: blur(2px); border-radius: 4px; }\n';
const EXPECTED_COPY = [
  '.card {\n  transform: rotate(2deg);\n  filter: blur(2px);\n  border-radius: 4px;\n}',
  '.card {\n  padding: 24px;\n}',
  '/* inline */ {\n  mix-blend-mode: multiply;\n  opacity: 0.9;\n}',
].join('\n\n');

async function extrasProject(page: Page): Promise<void> {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Extras Seed', 'html');
  await api.waitForRuns(project.id, 1);
  const main = project.directions[0];
  if (!main) throw new Error('no direction');
  writeFileSync(path.join(main.workTree, 'extras.css'), SHEET);
  writeFileSync(path.join(main.workTree, 'index.html'), PAGE);
  await expect(frontFrame(page).locator('h1')).toHaveText('Extras Page');
  await expect(frontFrame(page).locator('article.card')).toHaveCSS('mix-blend-mode', 'multiply');
}

async function selectCard(page: Page): Promise<void> {
  await setSelectMode(page, true);
  const card = frontFrame(page).locator('article.card');
  const box = await card.boundingBox();
  if (!box) throw new Error('card not visible');
  await card.click({ position: { x: 12, y: box.height / 2 } });
  await expect(page.locator('.ins-tag')).toHaveText('article');
}

async function selectedBox(page: Page) {
  return page.locator('.overlay .box.selected').boundingBox();
}

test('R4-8: the breadcrumb lists each ancestor, collapses the middle, and a click selects it', async ({ page }) => {
  await extrasProject(page);
  await selectInFrame(page, 'h1');
  const crumbs = page.getByRole('navigation', { name: 'Element path' });
  await expect(page.locator('.ins-tag')).toHaveText('h1');
  await expect(crumbs.locator('.ins-crumb')).toHaveText(['main.shell', '…', 'div.row', 'div.col', 'article.card', 'h1.title']);
  await expect(crumbs.locator('.ins-crumb.gap')).toHaveAttribute('title', 'section.wrap');
  await crumbs.getByRole('button', { name: 'Show 1 more' }).click();
  await expect(crumbs.locator('.ins-crumb')).toHaveText(['main.shell', 'section.wrap', 'div.row', 'div.col', 'article.card', 'h1.title']);

  const before = await selectedBox(page);
  await crumbs.getByRole('button', { name: 'article.card', exact: true }).click();
  await expect(page.locator('.ins-tag')).toHaveText('article');
  await expect(crumbs.locator('.ins-crumb.current')).toHaveText('article.card');
  await expect(crumbs.locator('.ins-crumb')).toHaveText(['main.shell', 'section.wrap', 'div.row', 'div.col', 'article.card']);
  await expect.poll(async () => JSON.stringify(await selectedBox(page))).not.toBe(JSON.stringify(before));

  await crumbs.getByRole('button', { name: 'main.shell', exact: true }).click();
  await expect(page.locator('.ins-tag')).toHaveText('main');
  await expect(crumbs).toHaveCount(0);
});

test('R4-8: Copy CSS puts the authored rules and the inline style on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
  await extrasProject(page);
  await selectCard(page);
  await page.getByRole('button', { name: 'Copy CSS' }).click();
  await expect(page.locator('.ins-copy-css')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EXPECTED_COPY);
});

test('R4-9: Other styles lists authored CSS the panel does not cover', async ({ page }) => {
  await extrasProject(page);
  await selectCard(page);
  const section = page.getByRole('region', { name: 'Other styles' });
  const toggle = section.getByRole('button', { name: /Other styles/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(section.locator('.ins-other-count')).toHaveText('2');
  await toggle.click();
  const rows = section.locator('.ins-other-row');
  await expect(rows.locator('.ins-other-decl')).toHaveText(['transform: rotate(2deg)', 'mix-blend-mode: multiply']);
  await expect(rows.locator('.ins-other-source')).toHaveText(['extras.css', 'inline']);
  await expect(rows.first()).toHaveAttribute('title', 'transform: rotate(2deg)\nFrom extras.css');
  await expect(section).not.toContainText('filter');
  await expect(section).not.toContainText('padding');
  await expect(section).not.toContainText('border-radius');
  await section.scrollIntoViewIfNeeded();
  await page.locator('.inspector').screenshot({ path: test.info().outputPath('inspector-extras.png') });

  await selectInFrame(page, 'h1');
  await expect(page.locator('.ins-tag')).toHaveText('h1');
  await expect(page.getByRole('region', { name: 'Other styles' })).toHaveCount(0);
});
