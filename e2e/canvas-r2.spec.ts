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

const COMMIT_PROBE = () => {
  type Fiber = { tag: number; type: unknown; stateNode: unknown; child: Fiber | null; sibling: Fiber | null; return: Fiber | null; flags: number };
  const state = { counting: false, canvas: 0, total: 0, prev: null as Fiber | null };
  const findCanvas = (root: Fiber | null): Fiber | null => {
    const el = document.querySelector('.canvas');
    if (!el) return null;
    const stack: Fiber[] = root ? [root] : [];
    while (stack.length > 0) {
      const fiber = stack.pop() as Fiber;
      if (fiber.stateNode === el) {
        let owner = fiber.return;
        while (owner && typeof owner.type !== 'function') owner = owner.return;
        return owner;
      }
      if (fiber.sibling) stack.push(fiber.sibling);
      if (fiber.child) stack.push(fiber.child);
    }
    return null;
  };
  (window as unknown as Record<string, unknown>).__commits = state;
  (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    checkDCE: () => undefined,
    onScheduleFiberRoot: () => undefined,
    onCommitFiberUnmount: () => undefined,
    onPostCommitFiberRoot: () => undefined,
    onCommitFiberRoot: (_id: number, root: { current: Fiber }) => {
      const canvas = findCanvas(root.current);
      const rendered = canvas !== null && canvas !== state.prev && (canvas.flags & 1) === 1;
      state.prev = canvas;
      if (!state.counting) return;
      state.total += 1;
      if (rendered) state.canvas += 1;
    },
  };
};

function stats(deltas: number[]): { frames: number; p95: number; max: number; over32: number } {
  const sorted = [...deltas].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
  return { frames: sorted.length, p95: Math.round(p95 * 10) / 10, max: Math.round((sorted.at(-1) ?? 0) * 10) / 10, over32: sorted.filter((d) => d > 32).length };
}

async function startFrameProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __frameRun: boolean };
    w.__frames = [];
    w.__frameRun = true;
    let last = 0;
    const tick = (ts: number) => {
      if (last) w.__frames.push(ts - last);
      last = ts;
      if (w.__frameRun) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopFrameProbe(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __frameRun: boolean };
    w.__frameRun = false;
    return w.__frames;
  });
}

test('R2-2: a 3 s pan and a 3 s zoom do not render Canvas, and stay smooth', async ({ page }) => {
  await page.addInitScript(COMMIT_PROBE);
  const api = await openHome(page);
  await createProjectViaUi(page, api, 'Pan Smooth Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Pan Smooth Page');
  for (const size of ['Tablet 768', 'Mobile 390']) {
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(size) }).click();
  }
  await focusStudio(page);
  await page.waitForTimeout(500);
  const stage = await box(page, '.stage');
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  const before = await box(page, '.artboard');

  await page.keyboard.down('Space');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.evaluate(() => {
    (window as unknown as { __commits: { counting: boolean } }).__commits.counting = true;
  });
  await startFrameProbe(page);
  const started = Date.now();
  let i = 0;
  while (Date.now() - started < 3000) {
    i += 1;
    await page.mouse.move(cx + Math.sin(i / 20) * 200, cy + Math.cos(i / 20) * 120);
    await page.waitForTimeout(8);
  }
  const panFrames = await stopFrameProbe(page);
  const panCommits = await page.evaluate(() => {
    const c = (window as unknown as { __commits: { counting: boolean; canvas: number; total: number } }).__commits;
    c.counting = false;
    return { canvas: c.canvas, total: c.total };
  });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const after = await box(page, '.artboard');
  expect(after.x).not.toBe(before.x);
  expect(panCommits.canvas).toBe(0);

  await page.mouse.move(cx, cy);
  await page.evaluate(() => {
    const c = (window as unknown as { __commits: { counting: boolean; canvas: number; total: number } }).__commits;
    c.canvas = 0;
    c.total = 0;
    c.counting = true;
  });
  await startFrameProbe(page);
  await page.keyboard.down('Control');
  const zoomStart = Date.now();
  i = 0;
  while (Date.now() - zoomStart < 3000) {
    i += 1;
    await page.mouse.wheel(0, Math.sin(i / 15) * 12);
    await page.waitForTimeout(8);
  }
  const zoomFrames = await stopFrameProbe(page);
  const zoomCommits = await page.evaluate(() => {
    const c = (window as unknown as { __commits: { counting: boolean; canvas: number; total: number } }).__commits;
    c.counting = false;
    return { canvas: c.canvas, total: c.total };
  });
  await page.keyboard.up('Control');
  await page.evaluate(() => {
    const c = (window as unknown as { __commits: { counting: boolean } }).__commits;
    c.counting = true;
  });
  await expect
    .poll(() => page.evaluate(() => JSON.stringify((window as unknown as { __commits: { canvas: number; total: number } }).__commits, ['canvas', 'total'])), { timeout: 3000 })
    .toMatch(/"canvas":[1-9]/);

  const pan = stats(panFrames);
  const zoom = stats(zoomFrames);
  console.log(`R2-2 pan ${JSON.stringify({ ...pan, moves: i, commits: panCommits })} zoom ${JSON.stringify({ ...zoom, commits: zoomCommits })}`);
  expect(zoomCommits.canvas).toBe(0);
  expect(pan.frames).toBeGreaterThan(100);
  expect(pan.p95).toBeLessThanOrEqual(17);
  expect(pan.over32).toBe(0);
});
