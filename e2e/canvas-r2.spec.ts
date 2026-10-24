import { expect, test, type Page } from '@playwright/test';
import { createProjectViaUi, frontFrame, openHome, setSelectMode } from './support/studio';

type Box = { x: number; y: number; width: number; height: number };

async function currentZoom(page: Page): Promise<number> {
  const transform = await page.locator('.artboard').evaluate((el) => (el as HTMLElement).style.transform);
  const match = /scale\(([\d.]+)\)/.exec(transform);
  if (!match?.[1]) throw new Error(`no scale in ${transform}`);
  return Number(match[1]);
}

async function box(page: Page, selector: string): Promise<Box> {
  const found = await page.locator(selector).boundingBox();
  if (!found) throw new Error(`${selector} not visible`);
  return found;
}

async function focusStudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.focus();
  });
}

async function focusFrame(page: Page): Promise<void> {
  await frontFrame(page).locator('h1').click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
}

function inside(inner: Box, outer: Box): boolean {
  return inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
}

async function armFitProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const artboard = document.querySelector<HTMLElement>('.artboard');
    const w = window as unknown as { __fitProbe?: Promise<{ ms: number; changed: boolean }> };
    w.__fitProbe = new Promise((resolve) => {
      const before = artboard?.style.transform ?? '';
      const measure = (startEpoch: number) =>
        requestAnimationFrame((ts) => resolve({ ms: performance.timeOrigin + ts - startEpoch, changed: (artboard?.style.transform ?? '') !== before }));
      const onKey = (e: KeyboardEvent) => {
        if (e.code !== 'Digit1' || !e.shiftKey) return;
        cleanup();
        measure(performance.timeOrigin + e.timeStamp);
      };
      const onMessage = (e: MessageEvent) => {
        const data = e.data as { type?: string; key?: string; at?: number } | null;
        if (data?.type !== 'zoom-key' || data.key !== 'fit' || typeof data.at !== 'number') return;
        cleanup();
        const at = data.at;
        queueMicrotask(() => measure(at));
      };
      const cleanup = () => {
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('message', onMessage, true);
      };
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('message', onMessage, true);
    });
  });
}

async function fitProbe(page: Page): Promise<{ ms: number; changed: boolean }> {
  return page.evaluate(() => (window as unknown as { __fitProbe: Promise<{ ms: number; changed: boolean }> }).__fitProbe);
}

test('R2-1: Figma zoom keys in the studio and in the preview', async ({ page }) => {
  const api = await openHome(page);
  await createProjectViaUi(page, api, 'Zoom Keys Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Zoom Keys Page');
  const zoomSelect = page.getByLabel('Zoom', { exact: true });
  const fitZoom = await currentZoom(page);
  const timings: Record<string, number> = {};
  let base = 0;

  for (const where of ['studio', 'frame'] as const) {
    const focus = () => (where === 'studio' ? focusStudio(page) : focusFrame(page));
    await focus();
    await page.keyboard.press('Shift+Digit0');
    await expect.poll(() => currentZoom(page)).toBe(1);
    await expect(zoomSelect).toHaveValue('1');

    base = await currentZoom(page);
    await page.keyboard.press('Equal');
    await expect.poll(() => currentZoom(page)).toBeGreaterThan(base);
    base = await currentZoom(page);
    await page.keyboard.press('Minus');
    await expect.poll(() => currentZoom(page)).toBeLessThan(base);

    await page.keyboard.press('ControlOrMeta+Digit0');
    await expect.poll(() => currentZoom(page)).toBe(1);

    await armFitProbe(page);
    await page.keyboard.press('Shift+Digit1');
    const probe = await fitProbe(page);
    expect(probe.changed).toBe(true);
    expect(probe.ms).toBeLessThanOrEqual(16.7 * 2);
    timings[`fit-${where}`] = Math.round(probe.ms * 10) / 10;
    await expect(zoomSelect).toHaveValue('fit');
    await expect.poll(() => currentZoom(page)).toBeCloseTo(fitZoom, 4);
  }

  await focusStudio(page);
  await setSelectMode(page, true);
  await frontFrame(page).locator('h1').click();
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  await focusStudio(page);
  await page.keyboard.press('Shift+Digit2');
  await expect.poll(() => currentZoom(page)).toBeGreaterThan(fitZoom);
  const stage = await box(page, '.stage');
  const selected = await box(page, '.overlay .box.selected');
  expect(Math.abs(selected.x + selected.width / 2 - (stage.x + stage.width / 2))).toBeLessThanOrEqual(2);
  expect(Math.abs(selected.y + selected.height / 2 - (stage.y + stage.height / 2))).toBeLessThanOrEqual(2);
  expect(inside(selected, stage)).toBe(true);

  await page.getByPlaceholder('Describe a change').focus();
  base = await currentZoom(page);
  await page.keyboard.press('Minus');
  await page.waitForTimeout(100);
  expect(await currentZoom(page)).toBe(base);
  console.log(`R2-1 timings ${JSON.stringify(timings)}`);
});

test('R2-3: three frames keep their place after reload and Shift+1 fits all', async ({ page }) => {
  const api = await openHome(page);
  await createProjectViaUi(page, api, 'Frames Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Frames Page');
  for (const size of ['Tablet 768', 'Mobile 390']) {
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(size) }).click();
  }
  await expect(page.locator('.canvas-frame')).toHaveCount(2);
  await expect(page.locator('.frame-label')).toHaveCount(3);
  await expect(page.locator('iframe.frame.front')).toHaveCount(1);
  await expect(page.locator('.canvas-frame iframe.frame.passive')).toHaveCount(2);
  await expect(page.locator('.canvas-frame iframe').first()).toHaveAttribute('width', '768');

  await focusStudio(page);
  await page.keyboard.press('Shift+Digit1');
  const stage = await box(page, '.stage');
  for (const selector of ['.artboard', '.canvas-frame >> nth=0', '.canvas-frame >> nth=1']) expect(inside(await box(page, selector), stage)).toBe(true);

  const zoom = await currentZoom(page);
  const label = page.getByRole('button', { name: 'Tablet 768 frame', exact: true });
  const start = await label.boundingBox();
  if (!start) throw new Error('no label');
  await page.mouse.move(start.x + 10, start.y + 5);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 105, { steps: 6 });
  await page.mouse.up();
  const moved = await label.boundingBox();
  expect(Math.round((moved?.x ?? 0) - start.x)).toBe(50);
  expect(Math.round((moved?.y ?? 0) - start.y)).toBe(100);

  const relative = async () => {
    const a = await box(page, '.artboard');
    const frames = page.locator('.canvas-frame');
    const out: { dx: number; dy: number; w: number }[] = [];
    const z = await currentZoom(page);
    for (let i = 0; i < (await frames.count()); i += 1) {
      const b = await frames.nth(i).boundingBox();
      if (!b) throw new Error('no frame box');
      out.push({ dx: Math.round((b.x - a.x) / z), dy: Math.round((b.y - a.y) / z), w: Math.round(b.width / z) });
    }
    return out;
  };
  const before = await relative();
  expect(before[0]?.dy).toBe(Math.round(100 / zoom));
  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText('Frames Page');
  await expect(page.locator('.canvas-frame')).toHaveCount(2);
  expect(await relative()).toEqual(before);

  await focusStudio(page);
  await page.keyboard.press('Shift+Digit1');
  const stageAfter = await box(page, '.stage');
  for (const selector of ['.artboard', '.canvas-frame >> nth=0', '.canvas-frame >> nth=1']) expect(inside(await box(page, selector), stageAfter)).toBe(true);

  await page.getByRole('button', { name: 'Mobile 390 frame', exact: true }).click();
  await expect(page.locator('.artboard')).toHaveAttribute('style', /width: 390px/);
  await expect(page.locator('[role="radiogroup"][aria-label="Viewport"] [aria-checked="true"]')).toHaveAttribute('aria-label', 'Mobile 390');
  await expect(frontFrame(page).locator('h1')).toHaveText('Frames Page');
  expect(await page.locator('.canvas-frame iframe').evaluateAll((els) => els.map((el) => el.getAttribute('width')).sort())).toEqual(['1440', '768']);
});
