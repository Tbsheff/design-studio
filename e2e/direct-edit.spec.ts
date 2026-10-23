import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { ROOT } from './support/server';
import { createProjectViaUi, type StudioApi, frontFrame, mainDirection, openHome, selectInFrame, setSelectMode, showVersions } from './support/studio';

const REVIEW_DIR = path.join(ROOT, 'design-review');

function changedLines(before: string, after: string): { before: string; after: string }[] {
  const a = before.split('\n');
  const b = after.split('\n');
  expect(b.length).toBe(a.length);
  return a.flatMap((line, index) => (line === b[index] ? [] : [{ before: line, after: b[index] ?? '' }]));
}

async function vitePage(page: Page, origin: string): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => frame.url().startsWith(origin))).toBe(true);
  const frame = page.frames().find((candidate) => candidate.url().startsWith(origin));
  if (!frame) throw new Error('vite frame not found');
  return frame;
}

async function expectSaved(page: Page): Promise<void> {
  await expect(page.locator('.ins-status.saved')).toBeVisible();
}

async function settledHead(page: Page, api: StudioApi, pid: string, did: string): Promise<number> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  const head = async () => (await api.project(pid)).directions.find((d) => d.id === did)?.headVersionId ?? null;
  const versions = await api.versions(pid, did);
  await expect.poll(head).toBe(versions[0]?.id ?? null);
  await expect(page.locator('li.version')).toHaveCount(versions.length);
  return versions.length;
}

async function blurFields(page: Page): Promise<void> {
  await page.locator('.ins-header .ins-tag').click();
}

async function screenshotInspector(page: Page): Promise<void> {
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const [width, height] of [
    [1440, 900],
    [800, 934],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.inspector')).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(REVIEW_DIR, `inspector-${width}x${height}.png`) });
    await page.locator('.ins-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.screenshot({ path: path.join(REVIEW_DIR, `inspector-${width}x${height}-lower.png`) });
    await page.locator('.ins-scroll').evaluate((el) => el.scrollTo(0, 0));
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
}

test('Direct edit: HTML style, text, undo, and element with children', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Harbor Direct Edit', 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Harbor Direct Edit');
  await api.waitForRuns(project.id, 1);
  const indexFile = path.join(main.workTree, 'index.html');
  const original = readFileSync(indexFile, 'utf8');

  await expect(page.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
  await selectInFrame(page, 'h1');
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ins-tag')).toHaveText('h1');
  await expect(page.locator('.ins-source')).toHaveText(/^index\.html:\d+$/);
  await expect(page.getByLabel('Text content')).toHaveValue('Harbor Direct Edit');
  await screenshotInspector(page);

  const srcBefore = await page.locator('iframe.frame.front').getAttribute('src');
  const fontSize = page.getByLabel('Font size', { exact: true });
  await fontSize.fill('48');
  await fontSize.press('Enter');
  const color = page.getByLabel('Text color', { exact: true });
  await color.fill('#c2410c');
  await color.press('Enter');
  await expectSaved(page);
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('color: #c2410c');

  const styledCount = await settledHead(page, api, project.id, main.id);
  const styled = readFileSync(indexFile, 'utf8');
  const diff = changedLines(original, styled);
  expect(diff).toHaveLength(1);
  expect(diff[0]?.before.trim()).toBe('<h1>Harbor Direct Edit</h1>');
  expect(diff[0]?.after).toMatch(/<h1 style="[^"]*font-size: 48px[^"]*">Harbor Direct Edit<\/h1>/);
  expect(diff[0]?.after.replace(/<h1 [^>]*>/, '<h1>')).toBe(diff[0]?.before);

  await expect.poll(() => page.locator('iframe.frame.front').getAttribute('src')).not.toBe(srcBefore);
  await expect(frame.locator('h1')).toHaveCSS('font-size', '48px');
  await expect(frame.locator('h1')).toHaveCSS('color', 'rgb(194, 65, 12)');
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  await expect(page.locator('.ins-tag')).toHaveText('h1');
  await expect(fontSize).toHaveValue('48px');
  await expect(page.locator('li.version .version-kind.manual').first()).toBeAttached();

  const text = page.getByLabel('Text content');
  await text.fill('Roasted every morning');
  await text.press('ControlOrMeta+Enter');
  await expectSaved(page);
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('>Roasted every morning</h1>');
  await expect.poll(() => settledHead(page, api, project.id, main.id)).toBe(styledCount + 1);
  const afterText = changedLines(styled, readFileSync(indexFile, 'utf8'));
  expect(afterText).toHaveLength(1);
  await expect(frame.locator('h1')).toHaveText('Roasted every morning');

  await blurFields(page);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toBe(styled);
  await expect(frame.locator('h1')).toHaveText('Harbor Direct Edit');

  await setSelectMode(page, true);
  await frame.locator('.card').first().click({ position: { x: 6, y: 6 } });
  await expect(page.locator('.ins-tag')).toHaveText('article');
  await expect(page.getByText('Has child elements')).toBeVisible();
  await expect(page.getByLabel('Text content')).toHaveCount(0);

  const beforeBad = readFileSync(indexFile, 'utf8');
  const width = page.getByLabel('Width', { exact: true });
  await width.fill('10px; color: red');
  await width.press('Enter');
  await expect(page.locator('.ins-error')).toContainText('not allowed');
  expect(readFileSync(indexFile, 'utf8')).toBe(beforeBad);
  await expect(width).not.toHaveValue('10px; color: red');
});

test('Direct edit: React color change uses HMR and Undo restores App.tsx', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Orbit Direct Edit', 'react');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Orbit Direct Edit', { timeout: 90_000 });
  await api.waitForRuns(project.id, 1);
  const origin = new URL((await api.preview(project.id, main.id)).url).origin;
  const appFile = path.join(main.workTree, 'src', 'App.tsx');
  const original = readFileSync(appFile, 'utf8');
  const vite = await vitePage(page, origin);
  await vite.evaluate(() => {
    (window as unknown as { __directMarker?: number }).__directMarker = 7;
  });
  const srcBefore = await page.locator('iframe.frame.front').getAttribute('src');

  await selectInFrame(page, 'h1');
  await expect(page.locator('.ins-source')).toContainText('App.tsx');
  const color = page.getByLabel('Text color', { exact: true });
  await color.fill('#0f766e');
  await color.press('Enter');
  await expectSaved(page);
  await expect.poll(() => readFileSync(appFile, 'utf8')).toMatch(/<h1 style=\{\{[^}]*color: ['"]#0f766e['"]/);
  await expect(frame.locator('h1')).toHaveCSS('color', 'rgb(15, 118, 110)');

  const same = await vitePage(page, origin);
  expect(await same.evaluate(() => (window as unknown as { __directMarker?: number }).__directMarker)).toBe(7);
  expect(await page.locator('iframe.frame.front').getAttribute('src')).toBe(srcBefore);
  await expect(page.locator('li.version .version-kind.manual').first()).toBeAttached();

  await settledHead(page, api, project.id, main.id);
  await showVersions(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => readFileSync(appFile, 'utf8')).toBe(original);
  await expect(frame.locator('h1')).not.toHaveCSS('color', 'rgb(15, 118, 110)');
});

async function overlayMatchesH1(page: Page): Promise<number> {
  const box = await page.locator('.overlay .box.selected').boundingBox();
  const zoom = await page.locator('.artboard').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  const h1 = await frontFrame(page).locator('h1').evaluate((el) => el.getBoundingClientRect().height);
  return box ? Math.abs(box.height - h1 * zoom) : Number.POSITIVE_INFINITY;
}

test('Direct edit: selection box follows the h1 after a font-size edit', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 934 });
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Harbor Overlay Rects', 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toHaveText('Harbor Overlay Rects');
  await api.waitForRuns(project.id, 1);
  const indexFile = path.join(main.workTree, 'index.html');

  await selectInFrame(page, 'h1');
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  const before = await page.locator('.overlay .box.selected').boundingBox();
  const srcBefore = await page.locator('iframe.frame.front').getAttribute('src');
  const fontSize = page.getByLabel('Font size', { exact: true });
  await fontSize.fill('40');
  await fontSize.press('Enter');
  await expectSaved(page);
  await expect.poll(() => readFileSync(indexFile, 'utf8')).toContain('font-size: 40px');
  await expect.poll(() => page.locator('iframe.frame.front').getAttribute('src')).not.toBe(srcBefore);
  await expect(frame.locator('h1')).toHaveCSS('font-size', '40px');
  await expect.poll(() => overlayMatchesH1(page)).toBeLessThanOrEqual(2);
  const after = await page.locator('.overlay .box.selected').boundingBox();
  expect(after?.height ?? 0).toBeLessThan(before?.height ?? 0);

  await frame.locator('h1').evaluate((el) => {
    (el as HTMLElement).style.setProperty('line-height', '3');
  });
  await expect.poll(() => overlayMatchesH1(page)).toBeLessThanOrEqual(2);
  const late = await page.locator('.overlay .box.selected').boundingBox();
  expect(late?.height ?? 0).toBeGreaterThan(after?.height ?? 0);
});
