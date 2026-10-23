import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, openHome } from './support/studio';

type Point = { x: number; y: number };

async function currentZoom(page: Page): Promise<number> {
  const transform = await page.locator('.artboard').evaluate((el) => (el as HTMLElement).style.transform);
  const match = /scale\(([\d.]+)\)/.exec(transform);
  if (!match?.[1]) throw new Error(`no scale in ${transform}`);
  return Number(match[1]);
}

async function zoomLabel(page: Page): Promise<string> {
  return page.getByLabel('Zoom', { exact: true }).evaluate((el) => {
    const select = el as HTMLSelectElement;
    return select.options[select.selectedIndex]?.text.trim() ?? '';
  });
}

async function artboardOrigin(page: Page): Promise<Point> {
  const box = await page.locator('.artboard').boundingBox();
  if (!box) throw new Error('artboard not visible');
  return { x: box.x, y: box.y };
}

async function pointInFrame(page: Page, fx: number, fy: number): Promise<Point> {
  const frame = await page.locator('iframe.frame.front').boundingBox();
  const stage = await page.locator('.stage').boundingBox();
  if (!frame || !stage) throw new Error('frame not visible');
  const left = Math.max(frame.x, stage.x);
  const top = Math.max(frame.y, stage.y);
  const right = Math.min(frame.x + frame.width, stage.x + stage.width);
  const bottom = Math.min(frame.y + frame.height, stage.y + stage.height);
  return { x: left + (right - left) * fx, y: top + (bottom - top) * fy };
}

async function expectPointKept(page: Page, at: Point, deltaY: number): Promise<number> {
  const before = await currentZoom(page);
  const origin = await artboardOrigin(page);
  const design = { x: (at.x - origin.x) / before, y: (at.y - origin.y) / before };
  await page.mouse.move(at.x, at.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, deltaY);
  await page.keyboard.up('Control');
  await expect.poll(() => currentZoom(page)).not.toBe(before);
  await page.waitForTimeout(100);
  const after = await currentZoom(page);
  const moved = await artboardOrigin(page);
  expect(Math.abs(moved.x + design.x * after - at.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(moved.y + design.y * after - at.y)).toBeLessThanOrEqual(4);
  return after;
}

function percentOf(label: string): number {
  const match = /(\d+)%/.exec(label);
  if (!match?.[1]) throw new Error(`no percent in "${label}"`);
  return Number(match[1]);
}

async function focusStudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.focus();
  });
}

test('canvas zoom: ctrl+wheel over the frame, buttons, and keyboard shortcuts', async ({ page }) => {
  const api = await openHome(page);
  await createProjectViaUi(page, api, 'Zoom Test Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Zoom Test Page');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('fit');
  const fitZoom = await currentZoom(page);
  const fitStart = await artboardOrigin(page);
  expect(await zoomLabel(page)).toBe(`Fit ${Math.round(fitZoom * 100)}%`);

  const zoomedIn = await expectPointKept(page, await pointInFrame(page, 0.3, 0.4), -100);
  expect(zoomedIn).toBeGreaterThan(fitZoom);
  expect(percentOf(await zoomLabel(page))).toBe(Math.round(zoomedIn * 100));

  const zoomedOut = await expectPointKept(page, await pointInFrame(page, 0.7, 0.6), 60);
  expect(zoomedOut).toBeLessThan(zoomedIn);
  expect(percentOf(await zoomLabel(page))).toBe(Math.round(zoomedOut * 100));

  const stage = await page.locator('.stage').boundingBox();
  if (!stage) throw new Error('stage not visible');
  await expectPointKept(page, { x: stage.x + stage.width - 12, y: stage.y + stage.height - 12 }, -80);

  const beforeIn = percentOf(await zoomLabel(page));
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(async () => percentOf(await zoomLabel(page))).toBeGreaterThan(beforeIn);
  const beforeOut = percentOf(await zoomLabel(page));
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect.poll(async () => percentOf(await zoomLabel(page))).toBeLessThan(beforeOut);

  await focusStudio(page);
  let base = await currentZoom(page);
  await page.keyboard.press('ControlOrMeta+Equal');
  await expect.poll(() => currentZoom(page)).toBeGreaterThan(base);
  base = await currentZoom(page);
  await page.keyboard.press('ControlOrMeta+Minus');
  await expect.poll(() => currentZoom(page)).toBeLessThan(base);
  await page.keyboard.press('ControlOrMeta+Digit1');
  await expect.poll(() => currentZoom(page)).toBe(1);
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('1');

  const inside = await pointInFrame(page, 0.5, 0.5);
  await page.mouse.click(inside.x, inside.y);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
  base = await currentZoom(page);
  await page.keyboard.press('ControlOrMeta+Equal');
  await expect.poll(() => currentZoom(page)).toBeGreaterThan(base);
  base = await currentZoom(page);
  await page.keyboard.press('ControlOrMeta+Minus');
  await expect.poll(() => currentZoom(page)).toBeLessThan(base);

  await page.keyboard.press('ControlOrMeta+Digit0');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('fit');
  await expect.poll(() => currentZoom(page)).toBeCloseTo(fitZoom, 4);
  expect(await zoomLabel(page)).toBe(`Fit ${Math.round(fitZoom * 100)}%`);

  await page.getByLabel('Zoom', { exact: true }).selectOption('0.5');
  await page.mouse.move(stage.x + stage.width - 12, stage.y + stage.height - 12);
  await page.mouse.wheel(0, 120);
  await page.getByLabel('Zoom', { exact: true }).selectOption('fit');
  await expect.poll(() => currentZoom(page)).toBeCloseTo(fitZoom, 4);
  const fitOrigin = await artboardOrigin(page);
  expect(Math.abs(fitOrigin.x - fitStart.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(fitOrigin.y - fitStart.y)).toBeLessThanOrEqual(1);
});
