import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE_URL, PREVIEW_FRAGMENT, previewOriginFor } from '../../support/server';
import { frontFrame, mainDirection, sendPrompt, showVersions } from '../../support/studio';
import { artboardTransform, createProject, evidence, previewFrame, runStatus, waitRun } from '../../../scripts/ac-edit/helpers';

test('AC-17 canvas shows partial writes while the run is still running', async ({ page }) => {
  const { api, project } = await createProject(page, 'Partial Write Cafe', 'html');
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect(frame.locator('.card')).toHaveCount(3);
  const indexFile = path.join(main.workTree, 'index.html');
  const completedSize = readFileSync(indexFile, 'utf8').length;

  await sendPrompt(page, '[slow] Streaming note');
  await expect.poll(async () => (await api.runs(project.id)).some((run) => run.request.prompt.includes('Streaming note'))).toBe(true);
  const runId = (await api.runs(project.id)).find((run) => run.request.prompt.includes('Streaming note'))?.id ?? '';

  const observations: { t: number; status: string; cards: number; h1: number; diskSize: number }[] = [];
  let partialSeenWhileRunning: (typeof observations)[number] | null = null;
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    const status = await runStatus(api, runId);
    const cards = await frame.locator('.card').count();
    const h1 = await frame.locator('h1').count();
    const statusAfter = await runStatus(api, runId);
    const obs = { t: Date.now() - started, status: statusAfter, cards, h1, diskSize: readFileSync(indexFile, 'utf8').length };
    observations.push(obs);
    if (status === 'running' && statusAfter === 'running' && cards < 3) {
      partialSeenWhileRunning = obs;
      break;
    }
    if (statusAfter !== 'running') break;
    await page.waitForTimeout(50);
  }
  const finished = await waitRun(api, runId);
  await expect(frame.locator('.mock-edit')).toHaveText('Streaming note');
  await expect(frame.locator('.card')).toHaveCount(3);
  evidence('AC-17', { completedSize, partialSeenWhileRunning, observations: observations.slice(-5), finalStatus: finished.status, runDurationMs: finished.durationMs });
  expect(partialSeenWhileRunning).not.toBeNull();
});

test('AC-18 HTML preview is an isolated sandboxed iframe on another origin', async ({ page }) => {
  const { project } = await createProject(page, 'Isolation Check', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Isolation Check');
  const iframe = page.locator('iframe.frame.front');
  const sandbox = await iframe.getAttribute('sandbox');
  const src = (await iframe.getAttribute('src')) ?? '';
  const frame = await previewFrame(page, PREVIEW_FRAGMENT);
  const probe = await frame.evaluate(async (studio) => {
    const attempt = (fn: () => unknown): string => {
      try {
        fn();
        return 'no-throw';
      } catch (error) {
        return error instanceof Error ? `${error.name}: ${error.message.slice(0, 80)}` : String(error);
      }
    };
    let fetchResult = '';
    try {
      const res = await fetch(`${studio}/api/projects`);
      fetchResult = `status ${res.status}`;
    } catch (error) {
      fetchResult = `threw ${error instanceof Error ? error.name : String(error)}`;
    }
    return {
      origin: window.location.origin,
      parentDocument: attempt(() => window.parent.document.title),
      parentLocalStorage: attempt(() => window.parent.localStorage.length),
      parentLocationHref: attempt(() => window.parent.location.href),
      fetchStudioApi: fetchResult,
      tokenInUrl: window.location.href.includes('__studio_token'),
    };
  }, BASE_URL);
  const result = { projectId: project.id, sandbox, srcOrigin: new URL(src).origin, studioOrigin: BASE_URL, ...probe };
  evidence('AC-18', result);
  expect(sandbox).toBe('allow-scripts allow-same-origin allow-forms');
  expect(new URL(src).origin).toBe(previewOriginFor(project.id));
  expect(previewOriginFor(project.id)).not.toBe(BASE_URL);
  expect(probe.origin).toBe(previewOriginFor(project.id));
  expect(probe.parentDocument).toMatch(/^SecurityError/);
  expect(probe.parentLocalStorage).toMatch(/^SecurityError/);
  expect(probe.parentLocationHref).toMatch(/^SecurityError/);
  expect(probe.fetchStudioApi).not.toBe('status 200');
  expect(probe.tokenInUrl).toBe(false);
});

test('AC-20 HTML reload keeps zoom, viewport, direction, chat scroll, draft, selection', async ({ page }) => {
  const { api, project } = await createProject(page, 'State Keeper', 'html');
  const main = mainDirection(project);
  const head = (await api.project(project.id)).directions[0]?.headVersionId ?? '';
  const directionB = await api.call<{ id: string; name: string; workTree: string }>('POST', `/api/projects/${project.id}/directions`, { fromVersionId: head, name: 'Second' });
  await page.reload();
  await showVersions(page);
  await page.locator('.list-item').filter({ hasText: 'Second' }).click();
  await expect(page.locator('.topbar')).toContainText('/ Second');
  for (let index = 1; index <= 5; index += 1) {
    await sendPrompt(page, `Chat filler message number ${index} with enough words to take some vertical room in the panel`);
    await api.waitForRuns(project.id, index + 1);
  }
  await page.getByRole('radio', { name: 'Tablet 768' }).click();
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.75');
  const stage = await page.locator('.stage').boundingBox();
  if (!stage) throw new Error('no stage');
  await page.mouse.move(stage.x + stage.width - 8, stage.y + stage.height - 8);
  await page.mouse.wheel(40, 60);
  await expect.poll(() => artboardTransform(page)).not.toContain('translate(0px');
  const chat = page.locator('.chat');
  const scrollable = await chat.evaluate((el) => el.scrollHeight > el.clientHeight + 20);
  await chat.evaluate((el) => {
    el.scrollTop = 40;
  });
  await page.getByRole('button', { name: /^Select/ }).click();
  await frontFrame(page).locator('.lede').click();
  await expect(page.locator('.chip')).toHaveCount(1);
  await page.getByRole('button', { name: /^Select/ }).click();
  await page.getByPlaceholder('Describe a change').fill('draft that must survive');

  const snapshot = async () => ({
    viewport: await page.locator('[role="radiogroup"][aria-label="Viewport"] [aria-checked="true"]').textContent(),
    zoom: await page.getByLabel('Zoom', { exact: true }).inputValue(),
    transform: await artboardTransform(page),
    direction: await page.locator('.topbar').textContent(),
    chatScrollTop: await chat.evaluate((el) => el.scrollTop),
    draft: await page.getByPlaceholder('Describe a change').inputValue(),
    chips: await page.locator('.chip').count(),
    iframeWidth: await page.locator('iframe.frame.front').getAttribute('width'),
  });
  const before = await snapshot();
  const frontSrcBefore = await page.locator('iframe.frame.front').getAttribute('src');

  const fileB = path.join(directionB.workTree, 'index.html');
  writeFileSync(fileB, readFileSync(fileB, 'utf8').replace('A clear starting point.', 'Reloaded lede text.'));
  await expect(frontFrame(page).locator('.lede')).toContainText('Reloaded lede text.');
  const frontSrcAfter = await page.locator('iframe.frame.front').getAttribute('src');
  const duringBanner = await snapshot();
  await api.call('POST', `/api/projects/${project.id}/d/${directionB.id}/keep`);
  await expect(page.locator('.banner')).toHaveCount(0);
  await page.waitForTimeout(300);
  const after = await snapshot();
  evidence('AC-20-html', { scrollable, before, duringBanner, after, reloaded: frontSrcBefore !== frontSrcAfter, mainWorkTree: main.workTree });
  expect(frontSrcAfter).not.toBe(frontSrcBefore);
  expect(after).toEqual(before);
  expect(scrollable).toBe(true);
});

test('AC-21 desktop, tablet, mobile and custom viewports size the frame', async ({ page }) => {
  const { project } = await createProject(page, 'Viewport Sizes', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Viewport Sizes');
  const measure = async () => {
    const frame = await previewFrame(page, PREVIEW_FRAGMENT);
    return frame.evaluate(() => ({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, clientWidth: document.documentElement.clientWidth }));
  };
  const results: Record<string, unknown> = { projectId: project.id };
  const presets: [string, number, number][] = [
    ['Desktop 1440', 1440, 900],
    ['Tablet 768', 768, 1024],
    ['Mobile 390', 390, 844],
  ];
  for (const [label, width, height] of presets) {
    await page.getByRole('radio', { name: label }).click();
    await expect.poll(async () => (await measure()).innerWidth).toBe(width);
    const m = await measure();
    results[label] = m;
    expect(m.innerHeight).toBe(height);
  }
  await page.getByRole('radio', { name: 'Custom' }).click();
  await page.getByLabel('Width').fill('1000');
  await page.getByLabel('Height').fill('700');
  await page.getByLabel('Height').press('Enter');
  await page.waitForTimeout(500);
  results.afterEnterOnly = await measure();
  await page.getByLabel('Height').press('Tab');
  await expect.poll(async () => { const m = await measure(); return `${m.innerWidth}x${m.innerHeight}`; }).toBe('1000x700');
  const custom = await measure();
  results.custom = custom;
  evidence('AC-21', results);
  expect(custom.innerHeight).toBe(700);
});

type Page = import('@playwright/test').Page;
type Box = { x: number; y: number; width: number; height: number } | null;
type Point = { x: number; y: number };

async function emptyStagePoint(page: Page): Promise<Point> {
  const stage = await page.locator('.stage').boundingBox();
  if (!stage) throw new Error('no stage');
  return { x: stage.x + stage.width - 10, y: stage.y + stage.height - 10 };
}

async function ctrlWheelZoom(page: Page, empty: Point): Promise<Record<string, unknown>> {
  await page.mouse.move(empty.x, empty.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -50);
  await page.keyboard.up('Control');
  await expect.poll(async () => page.getByLabel('Zoom', { exact: true }).inputValue()).not.toBe('0.5');
  return { zoom: await page.getByLabel('Zoom', { exact: true }).inputValue(), transform: await artboardTransform(page) };
}

async function wheelPan(page: Page, empty: Point): Promise<{ beforePan: Box; afterWheelPan: Box }> {
  const iframe = page.locator('iframe.frame.front');
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.5');
  await expect.poll(() => artboardTransform(page)).toContain('scale(0.5)');
  const beforePan = await iframe.boundingBox();
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.wheel(0, 120);
  await expect.poll(async () => Math.round((await iframe.boundingBox())?.y ?? 0)).toBe(Math.round((beforePan?.y ?? 0) - 120));
  return { beforePan, afterWheelPan: await iframe.boundingBox() };
}

async function hitTestAt(page: Page, empty: Point): Promise<unknown> {
  await page.mouse.click(empty.x, empty.y);
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return { hit: el ? `${el.tagName}.${el.className}` : null, active: document.activeElement ? `${document.activeElement.tagName}.${document.activeElement.className}` : null };
  }, empty);
}

async function spaceDragPan(page: Page, empty: Point): Promise<{ cursorClass: string | null; afterSpaceDrag: Box }> {
  await page.keyboard.down('Space');
  const cursorClass = await page.locator('.stage').getAttribute('class');
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.move(empty.x - 100, empty.y - 50, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  return { cursorClass, afterSpaceDrag: await page.locator('iframe.frame.front').boundingBox() };
}

async function middleDragPan(page: Page, empty: Point): Promise<Box> {
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(empty.x + 30, empty.y + 30, { steps: 3 });
  await page.mouse.up({ button: 'middle' });
  return page.locator('iframe.frame.front').boundingBox();
}

test('AC-22 zoom and pan the canvas', async ({ page }) => {
  await createProject(page, 'Zoom Pan', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Zoom Pan');
  const iframe = page.locator('iframe.frame.front');
  const log: Record<string, unknown> = {};
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.5');
  await expect.poll(() => artboardTransform(page)).toContain('scale(0.5)');
  const half = await iframe.boundingBox();
  log.at50 = { transform: await artboardTransform(page), iframeBox: half };
  expect(Math.round(half?.width ?? 0)).toBe(720);

  const empty = await emptyStagePoint(page);
  log.afterCtrlWheel = await ctrlWheelZoom(page, empty);
  const { beforePan, afterWheelPan } = await wheelPan(page, empty);
  log.hitTest = await hitTestAt(page, empty);
  const { cursorClass, afterSpaceDrag } = await spaceDragPan(page, empty);
  log.cursorClassWhileSpace = cursorClass;
  const afterMiddleDrag = await middleDragPan(page, empty);
  log.pan = { beforePan, afterWheelPan, afterSpaceDrag, afterMiddleDrag };
  evidence('AC-22', log);
  expect(Math.round(afterWheelPan?.y ?? 0)).toBe(Math.round((beforePan?.y ?? 0) - 120));
  expect(Math.round((afterSpaceDrag?.x ?? 0) - (afterWheelPan?.x ?? 0))).toBe(-100);
  expect(Math.round((afterSpaceDrag?.y ?? 0) - (afterWheelPan?.y ?? 0))).toBe(-50);
  expect(Math.round((afterMiddleDrag?.x ?? 0) - (afterSpaceDrag?.x ?? 0))).toBe(30);
});

test('AC-23 HTML console and thrown errors appear in the studio', async ({ page }) => {
  const { project } = await createProject(page, 'Error Surface', 'html');
  const main = mainDirection(project);
  await expect(frontFrame(page).locator('h1')).toHaveText('Error Surface');
  const file = path.join(main.workTree, 'index.html');
  const source = readFileSync(file, 'utf8');
  const withErrors = source.replace(
    '<body>',
    `<body>\n  <script>console.error('ac23 early console boom');</script>\n  <script>setTimeout(function () { throw new Error('ac23 thrown later'); }, 300);</script>`,
  );
  writeFileSync(file, withErrors);
  const panel = page.getByRole('region', { name: 'Preview errors' });
  await expect(panel).toContainText('ac23 early console boom');
  await expect(panel).toContainText('ac23 thrown later');
  const items = await panel.locator('li').allTextContents();
  const thrownItem = panel.locator('li').filter({ hasText: 'ac23 thrown later' }).first();
  await thrownItem.getByRole('button', { name: 'Send to agent' }).click();
  const draft = await page.getByPlaceholder('Describe a change').inputValue();
  evidence('AC-23-html', { items, draft });
  expect(draft).toContain('ac23 thrown later');
});

test('AC-24 last completed design stays viewable while a new version generates', async ({ page }) => {
  const { api, project } = await createProject(page, 'Keep Viewable', 'html');
  const frame = frontFrame(page);
  await expect(frame.locator('.card')).toHaveCount(3);
  await sendPrompt(page, '[slow] Generating a longer note');
  await expect.poll(async () => (await api.runs(project.id)).some((run) => run.status === 'running')).toBe(true);
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  const runId = (await api.runs(project.id)).find((run) => run.status === 'running')?.id ?? '';
  await page.getByRole('radio', { name: 'Last completed' }).click();
  await expect(page.getByRole('radio', { name: 'Last completed' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('iframe.frame.front')).toHaveAttribute('src', /\/s\//);
  await expect(frame.locator('h1')).toHaveText('Keep Viewable');
  await expect(frame.locator('.card')).toHaveCount(3);
  const statusWhileViewing = await runStatus(api, runId);
  const frontSrc = await page.locator('iframe.frame.front').getAttribute('src');
  const liveDisk = readFileSync(path.join(mainDirection(project).workTree, 'index.html'), 'utf8').length;
  await page.waitForTimeout(1600);
  const stillOld = { cards: await frame.locator('.card').count(), mockEdit: await frame.locator('.mock-edit').count(), status: await runStatus(api, runId) };
  const finished = await waitRun(api, runId);
  await page.getByRole('radio', { name: 'Live', exact: true }).click();
  await expect(frame.locator('.mock-edit')).toHaveText('Generating a longer note');
  evidence('AC-24', { statusWhileViewing, liveDiskSizeWhileViewing: liveDisk, frontSrc: frontSrc?.split('?')[0], stillOld, finalStatus: finished.status });
  expect(statusWhileViewing).toBe('running');
  expect(frontSrc).toContain('/s/');
  expect(stillOld.cards).toBe(3);
});
