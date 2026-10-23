import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildUserText } from '../../../src/server/agent/user-message';
import { PREVIEW_FRAGMENT } from '../../support/server';
import { frontFrame, mainDirection, sendPrompt, setSelectMode } from '../../support/studio';
import { changedLines, evidence, evidencePath, importHtmlFixture, previewFrame, runFile } from '../../../scripts/ac-edit/helpers';

const SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23396'/%3E%3C/svg%3E";

const FIXTURE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fixture</title>
<style>
body { margin: 0; font-family: sans-serif; color: #222; }
.card { padding: 16px; margin: 16px; border: 1px solid #ccc; }
.tall { height: 2400px; }
</style>
</head>
<body>
<header>
<h1 id="title">Fixture <span class="inner">nested <b class="deep">deep</b></span></h1>
</header>
<main>
<article class="card first">
<h2 class="card-title">Card one</h2>
<p class="card-body">Body one</p>
<img class="pic" alt="Green box" width="120" height="80" src="${SVG}">
<button class="btn" type="button" onclick="document.title = 'clicked'">Press</button>
<a class="out" href="https://example.com/">Go out</a>
<a class="hash" href="#below">Hash link</a>
</article>
<article class="card second">
<h2 class="card-title">Card two</h2>
<p class="card-body">Body two</p>
</article>
<div class="tall"></div>
<p id="below" class="far">Far below</p>
</main>
</body>
</html>
`;

async function frameOf(page: Page): Promise<Frame> {
  return previewFrame(page, PREVIEW_FRAGMENT);
}

async function compareRects(page: Page, selector: string) {
  const frame = await frameOf(page);
  const iframe = await page.locator('iframe.frame.front').boundingBox();
  if (!iframe) throw new Error('no iframe box');
  const width = Number(await page.locator('iframe.frame.front').getAttribute('width'));
  const zoom = iframe.width / width;
  const el = await frame.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  }, selector);
  const box = await page.locator('.overlay .box.selected').first().boundingBox();
  if (!el || !box) throw new Error('missing rect');
  const expected = { x: iframe.x + el.x * zoom, y: iframe.y + el.y * zoom, width: el.width * zoom, height: el.height * zoom };
  const delta = Math.max(Math.abs(expected.x - box.x), Math.abs(expected.y - box.y), Math.abs(expected.width - box.width), Math.abs(expected.height - box.height));
  return { zoom, expected, box, delta };
}

test('AC-25 click nested span, image, button and links to select them', async ({ page }) => {
  const { project } = await importHtmlFixture(page, FIXTURE);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toContainText('Fixture');
  const raw = await frameOf(page);
  const urlBefore = raw.url();
  await setSelectMode(page, true);
  const results: Record<string, unknown>[] = [];
  for (const [selector, tag] of [
    ['span.inner', 'span'],
    ['b.deep', 'b'],
    ['img.pic', 'img'],
    ['button.btn', 'button'],
    ['a.out', 'a'],
    ['a.hash', 'a'],
  ] as const) {
    await frame.locator(selector).click();
    await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
    await expect(page.locator('.chip').first()).toHaveAttribute('title', new RegExp(`${tag}(:nth-of-type\\(\\d+\\))?$`), { timeout: 5_000 }).catch(() => undefined);
    const chip = await page.locator('.chip').first().getAttribute('title');
    const chipText = await page.locator('.chip').first().textContent();
    const current = await frameOf(page);
    results.push({ selector, chipSelector: chip, chipText, frameUrlSame: current.url() === urlBefore, title: await current.title() });
    if (!chipText?.startsWith(tag)) console.log(`[AC-25 mismatch] ${selector} -> ${chipText} ${chip}`);
    expect(chipText?.startsWith(tag)).toBe(true);
  }
  const frameCount = page.frames().filter((f) => f.url().includes(PREVIEW_FRAGMENT)).length;
  const finalFrame = await frameOf(page);
  const scrollY = await finalFrame.evaluate(() => window.scrollY);
  evidence('AC-25', { projectId: project.id, results, frameCount, scrollYAfterHashClick: scrollY, urlBefore: urlBefore.split('?')[0], urlAfter: finalFrame.url().split('?')[0] });
  for (const row of results) {
    expect(row.frameUrlSame).toBe(true);
    expect(row.title).toBe('Fixture');
  }
  expect(scrollY).toBe(0);
});

test('AC-26 selection highlight matches the element and leaves the DOM unchanged', async ({ page }) => {
  const { project, folder } = await importHtmlFixture(page, FIXTURE);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toContainText('Fixture');
  const fileBefore = readFileSync(path.join(folder, 'index.html'), 'utf8');
  const domBefore = await (await frameOf(page)).evaluate(() => document.documentElement.outerHTML);
  await setSelectMode(page, true);
  await frame.locator('p.card-body').first().hover();
  await frame.locator('h2.card-title').first().click();
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  const domAfterSelect = await (await frameOf(page)).evaluate(() => document.documentElement.outerHTML);
  const at100 = await compareRects(page, 'h2.card-title');
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.5');
  await expect.poll(async () => (await compareRects(page, 'h2.card-title')).zoom).toBeCloseTo(0.5, 2);
  const at50 = await compareRects(page, 'h2.card-title');
  await page.screenshot({ path: evidencePath('AC-26-zoom50.png') });
  await (await frameOf(page)).evaluate(() => window.scrollTo(0, 120));
  await expect.poll(async () => (await compareRects(page, 'h2.card-title')).delta).toBeLessThanOrEqual(2);
  const afterScroll = await compareRects(page, 'h2.card-title');
  const scrolled = await (await frameOf(page)).evaluate(() => window.scrollY);
  await page.screenshot({ path: evidencePath('AC-26-scrolled.png') });
  await setSelectMode(page, false);
  const domEnd = await (await frameOf(page)).evaluate(() => document.documentElement.outerHTML);
  const fileAfter = readFileSync(path.join(folder, 'index.html'), 'utf8');
  evidence('AC-26', {
    projectId: project.id,
    domIdenticalAfterSelect: domBefore === domAfterSelect,
    domIdenticalAtEnd: domBefore === domEnd,
    domLength: domBefore.length,
    fileUnchanged: fileBefore === fileAfter,
    at100,
    at50,
    afterScroll,
    scrolled,
  });
  expect(domAfterSelect).toBe(domBefore);
  expect(domEnd).toBe(domBefore);
  expect(fileAfter).toBe(fileBefore);
  expect(at100.delta).toBeLessThanOrEqual(2);
  expect(at50.delta).toBeLessThanOrEqual(2);
  expect(afterScroll.delta).toBeLessThanOrEqual(2);
  expect(scrolled).toBe(120);
});

test('AC-30 AC-32 AC-27 shift-select two elements, one prompt, one version with both changes', async ({ page }) => {
  const { api, project, folder } = await importHtmlFixture(page, FIXTURE);
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('h1')).toContainText('Fixture');
  const versionsBefore = await api.versions(project.id, main.id);
  const file = path.join(folder, 'index.html');
  const before = readFileSync(file, 'utf8');
  await setSelectMode(page, true);
  await frame.locator('.card.first h2.card-title').click();
  await frame.locator('.card.second h2.card-title').click({ modifiers: ['Shift'] });
  await expect(page.locator('.overlay .box.selected')).toHaveCount(2);
  await expect(page.locator('.chip')).toHaveCount(2);
  const otherColorsBefore = await frame.locator('h1, p, button, a').evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  await sendPrompt(page, 'color #c00');
  const runs = await api.waitForRuns(project.id, 1);
  const run = runs[0];
  if (!run) throw new Error('run missing');
  await expect.poll(() => frame.locator('h2.card-title').evaluateAll((els) => els.map((el) => getComputedStyle(el).color))).toEqual(['rgb(204, 0, 0)', 'rgb(204, 0, 0)']);
  const otherColorsAfter = await frame.locator('h1, p, button, a').evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  const versionsAfter = await api.versions(project.id, main.id);
  const after = readFileSync(file, 'utf8');
  const diff = changedLines(before, after);
  const stored = runFile(project.id, run.id);
  const userText = buildUserText({ request: stored.request, designMd: '' });
  evidence('AC-30', { runs: runs.length, versionsBefore: versionsBefore.length, versionsAfter: versionsAfter.length, newVersion: versionsAfter.find((v) => !versionsBefore.some((b) => b.id === v.id)), diff, otherColorsSame: JSON.stringify(otherColorsBefore) === JSON.stringify(otherColorsAfter) });
  evidence('AC-27-html', {
    runFileSelection: stored.request.selection?.map((s) => ({ source: s.source, selector: s.selector, tag: s.tag, styleKeys: Object.keys(s.styles).length, outerHTML: s.outerHTML, ancestors: s.ancestors })),
    userText,
  });
  expect(runs).toHaveLength(1);
  expect(versionsAfter.length).toBe(versionsBefore.length + 1);
  expect(diff).toHaveLength(2);
  expect(diff.every((row) => row.after.includes('class="card-title"') && row.after.includes('color: #c00'))).toBe(true);
  expect(otherColorsAfter).toEqual(otherColorsBefore);
  expect(stored.request.selection).toHaveLength(2);
  expect(stored.request.selection?.map((s) => s.source?.line)).toEqual([18, 26]);
  expect(userText).toContain('source: index.html:18:1');
  expect(userText).toContain('source: index.html:26:1');
  expect(userText.match(/styles: color: /g)?.length).toBe(2);
  expect(userText.match(/outerHTML:/g)?.length).toBe(2);
});
