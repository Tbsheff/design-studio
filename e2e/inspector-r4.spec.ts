import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, mainDirection, openHome, selectInFrame, setSelectMode } from './support/studio';

const SHOTS = process.env.STUDIO_R4_SHOTS ?? '';

async function openProject(page: Page, api: StudioApi, prompt: string): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt, kind: 'html' });
  await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText(prompt);
  return api.project(project.id);
}

function lineOf(file: string, needle: string): string {
  return readFileSync(file, 'utf8').split('\n').find((line) => line.includes(needle)) ?? '';
}

async function settled(page: Page): Promise<void> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
}

async function selectCard(page: Page): Promise<void> {
  await setSelectMode(page, true);
  await frontFrame(page).locator('.card').first().click({ position: { x: 6, y: 6 } });
  await expect(page.locator('.ins-tag')).toHaveText('article');
}

async function selectCards(page: Page): Promise<void> {
  await selectCard(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.ins-tag')).toHaveText('section');
}

async function stampOnPress(button: Locator): Promise<void> {
  await button.evaluate((el) => {
    el.addEventListener('pointerdown', () => ((window as unknown as { __pressAt: number }).__pressAt = performance.timeOrigin + performance.now()), { once: true });
  });
}

async function fileChangedAt(file: string, needle: string, timeoutMs: number): Promise<number> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (readFileSync(file, 'utf8').includes(needle)) return Date.now();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`file never contained ${needle}`);
}

async function shot(page: Page, name: string, section: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const target = page.getByRole('region', { name: section });
  await target.scrollIntoViewIfNeeded();
  await page.locator('.inspector').screenshot({ path: path.join(SHOTS, `after-w3-${name}.png`) });
}

test('Inspector R4: auto layout, sizing, align self and timing', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, 'Kiln Flex Cards');
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  const frame = frontFrame(page);

  await selectCards(page);
  const layout = page.getByRole('region', { name: 'Auto layout' });
  await expect(layout.getByRole('button', { name: /Add auto layout/ })).toBeVisible();
  await page.keyboard.press('Shift+A');
  await expect.poll(() => lineOf(file, 'aria-label="Highlights"')).toContain('display: flex');
  await settled(page);
  await expect(frame.locator('.cards')).toHaveCSS('display', 'flex');
  await expect(layout.getByRole('group', { name: 'Direction' })).toBeVisible();
  await expect(layout.getByRole('button', { name: /Add auto layout/ })).toHaveCount(0);

  await selectCard(page);
  const widthMode = page.getByLabel('Width sizing');
  await widthMode.selectOption('fill');
  await expect.poll(() => lineOf(file, 'First idea')).toContain('flex: 1');
  await settled(page);
  await expect(widthMode).toHaveValue('fill');
  const self = page.getByRole('group', { name: 'Align self' });
  await self.getByRole('button', { name: 'Align self center' }).click();
  await expect.poll(() => lineOf(file, 'First idea')).toContain('align-self: center');
  await settled(page);

  await selectCards(page);
  const vertical = layout.getByRole('button', { name: 'Vertical' });
  await stampOnPress(vertical);
  const repaint = frame.locator('.cards').evaluate(
    (el) =>
      new Promise<number>((resolve) => {
        const check = () => (getComputedStyle(el).flexDirection === 'column' ? resolve(performance.timeOrigin + performance.now()) : requestAnimationFrame(check));
        check();
      }),
  );
  await vertical.click();
  const bytesAt = await fileChangedAt(file, 'flex-direction: column', 5000);
  const paintedAt = await repaint;
  const pressAt = await page.evaluate(() => (window as unknown as { __pressAt: number }).__pressAt);
  const previewMs = Math.round(paintedAt - pressAt);
  const fileMs = Math.round(bytesAt - pressAt);
  console.log(`[r4-timing] row->column preview ${previewMs} ms, file bytes ${fileMs} ms`);
  test.info().annotations.push({ type: 'timing', description: `preview ${previewMs} ms, file ${fileMs} ms` });
  expect(previewMs).toBeLessThan(250);
  expect(lineOf(file, 'aria-label="Highlights"')).toMatch(/style="[^"]*flex-direction: column/);
  await settled(page);
  await layout.getByRole('button', { name: 'Align center center' }).click();
  await expect.poll(() => lineOf(file, 'aria-label="Highlights"')).toContain('justify-content: center');
  expect(lineOf(file, 'aria-label="Highlights"')).toContain('align-items: center');
  await settled(page);
  await shot(page, 'flex', 'Auto layout');

  await selectInFrame(page, 'h1');
  await page.getByLabel('Width sizing').selectOption('fill');
  await expect.poll(() => lineOf(file, '<h1')).toContain('width: 100%');
  expect(lineOf(file, '<h1')).not.toContain('flex:');
  await settled(page);
  await expect(page.getByRole('group', { name: 'Align self' })).toHaveCount(0);
});

test('Inspector R4: math, per-corner radius, shadow read back and scroll', async ({ page }) => {
  const api = await openHome(page);
  const project = await openProject(page, api, 'Kiln Effects');
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');

  await selectInFrame(page, 'h1');
  const size = page.getByLabel('Font size', { exact: true });
  await size.fill('12+4');
  const sent = page.waitForRequest((req) => req.url().endsWith('/direct-edit') && req.method() === 'POST');
  const enterAt = Date.now();
  await size.press('Enter');
  await sent;
  const requestMs = Date.now() - enterAt;
  console.log(`[r4-timing] Enter -> direct-edit request ${requestMs} ms`);
  expect(requestMs).toBeLessThan(200);
  await expect.poll(() => lineOf(file, '<h1')).toContain('font-size: 16px');
  await settled(page);
  await expect(size).toHaveValue('16px');
  await size.fill('+8');
  await size.press('Enter');
  await expect.poll(() => lineOf(file, '<h1')).toContain('font-size: 24px');
  await settled(page);

  await selectCard(page);
  await page.getByRole('button', { name: 'Independent corners' }).click();
  const corners: [string, string][] = [
    ['Top left radius', '4'],
    ['Top right radius', '8'],
    ['Bottom right radius', '12'],
    ['Bottom left radius', '16'],
  ];
  for (const [label, value] of corners) {
    const field = page.getByLabel(label, { exact: true });
    await field.fill(value);
    await field.press('Enter');
    await settled(page);
  }
  await expect.poll(() => lineOf(file, 'First idea')).toContain('border-radius: 4px 8px 12px 16px');
  await shot(page, 'corners', 'Fill and border');

  const effects = page.getByRole('region', { name: 'Effects' });
  await effects.getByRole('button', { name: 'Add shadow' }).click();
  await expect.poll(() => lineOf(file, 'First idea')).toContain('box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.12)');
  await settled(page);
  const y = page.getByLabel('Shadow 1 y offset', { exact: true });
  await y.fill('4*2');
  await y.press('Enter');
  await expect.poll(() => lineOf(file, 'First idea')).toContain('box-shadow: 0 8px 12px 0 rgb(0 0 0 / 0.12)');
  await settled(page);
  const color = page.getByLabel('Shadow 1 color', { exact: true });
  await color.fill('var(--line)');
  await color.press('Enter');
  await expect.poll(() => lineOf(file, 'First idea')).toContain('box-shadow: 0 8px 12px 0 var(--line)');
  await settled(page);
  await page.getByLabel('Layer blur', { exact: true }).fill('2');
  await page.getByLabel('Layer blur', { exact: true }).press('Enter');
  await expect.poll(() => lineOf(file, 'First idea')).toContain('filter: blur(2px)');
  await settled(page);
  const card = lineOf(file, 'First idea');
  expect(card.match(/box-shadow:/g)).toHaveLength(1);
  await shot(page, 'effects', 'Effects');

  const fields = ['Shadow 1 x offset', 'Shadow 1 y offset', 'Shadow 1 blur', 'Shadow 1 spread', 'Shadow 1 color', 'Layer blur'];
  const read = () => Promise.all(fields.map((label) => page.getByLabel(label, { exact: true }).inputValue()));
  const before = await read();
  expect(before).toEqual(['0', '8px', '12px', '0', 'var(--line)', '2px']);

  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText('Kiln Effects');
  await selectCard(page);
  expect(await read()).toEqual(before);
  await expect(page.getByLabel('Top right radius', { exact: true })).toHaveValue('8px');

  for (const [width, height] of [
    [1600, 1000],
    [1440, 900],
    [1280, 720],
    [800, 934],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.locator('.ins-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const blurField = page.getByLabel('Layer blur', { exact: true });
    await expect(blurField).toBeVisible();
    const reach = await blurField.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const prompt = document.querySelector('.panel.right .prompt')?.getBoundingClientRect();
      return { hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el, bottom: r.bottom, promptTop: prompt?.top ?? Infinity };
    });
    expect(reach, `${width}x${height}`).toMatchObject({ hit: true });
    expect(reach.bottom, `${width}x${height}`).toBeLessThanOrEqual(reach.promptTop);
  }
});
