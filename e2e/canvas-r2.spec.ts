import { writeFileSync } from 'node:fs';
import path from 'node:path';
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

async function armFitProbe(page: Page, where: 'studio' | 'frame'): Promise<void> {
  await page.evaluate(() => {
    const artboard = document.querySelector<HTMLElement>('.artboard');
    const w = window as unknown as { __fitPainted?: Promise<{ at: number; changed: boolean }> };
    const before = artboard?.style.transform ?? '';
    w.__fitPainted = new Promise((resolve) => {
      const onSignal = () => {
        window.removeEventListener('keydown', onSignal, true);
        window.removeEventListener('message', onSignal, true);
        queueMicrotask(() => requestAnimationFrame(() => resolve({ at: Date.now(), changed: (artboard?.style.transform ?? '') !== before })));
      };
      window.addEventListener('keydown', onSignal, true);
      window.addEventListener('message', onSignal, true);
    });
  });
  const target = where === 'studio' ? page.mainFrame() : page.frames().find((f) => f !== page.mainFrame() && f.url().includes('__studio') === false && f.parentFrame() === page.mainFrame());
  if (!target) throw new Error('no frame');
  await target.evaluate(() => {
    const w = window as unknown as { __fitKey?: number };
    window.addEventListener('keydown', () => (w.__fitKey = Date.now()), { capture: true, once: true });
  });
}

async function fitProbe(page: Page, where: 'studio' | 'frame'): Promise<{ ms: number; changed: boolean }> {
  const painted = await page.evaluate(() => (window as unknown as { __fitPainted: Promise<{ at: number; changed: boolean }> }).__fitPainted);
  const target = where === 'studio' ? page.mainFrame() : page.frames().find((f) => f !== page.mainFrame() && f.parentFrame() === page.mainFrame());
  const key = await target?.evaluate(() => (window as unknown as { __fitKey?: number }).__fitKey ?? 0);
  return { ms: painted.at - (key ?? 0), changed: painted.changed };
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

    await armFitProbe(page, where);
    await page.keyboard.press('Shift+Digit1');
    const probe = await fitProbe(page, where);
    expect(probe.changed).toBe(true);
    expect(probe.ms).toBeLessThanOrEqual(17.7);
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

  const tablet = page.locator('.canvas-frame[data-frame-id]').filter({ has: page.getByRole('button', { name: 'Tablet 768 frame', exact: true }) });
  const beforeNudge = await tablet.getAttribute('style');
  await page.getByRole('button', { name: 'Tablet 768 frame', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => tablet.getAttribute('style')).not.toBe(beforeNudge);
  const leftOf = (style: string | null) => Number(/left: (-?[\d.]+)px/.exec(style ?? '')?.[1]);
  expect(leftOf(await tablet.getAttribute('style')) - leftOf(beforeNudge)).toBe(10);

  await page.getByRole('button', { name: 'Desktop 1440 frame', exact: true }).hover();
  await page.getByRole('button', { name: 'Remove Desktop 1440 frame', exact: true }).click();
  await expect(page.locator('.frame-label')).toHaveCount(2);
  await page.locator('.frame-undo').getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.frame-label')).toHaveCount(3);
  await expect(page.locator('.frame-undo')).toHaveCount(0);
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

function layersPage(): string {
  const cards = Array.from({ length: 160 }, (_, i) => `<article class="card c${i}"><h3>Card ${i}</h3><p>Body <b>${i}</b></p><ul><li>One</li><li>Two</li></ul></article>`).join('\n');
  return `<!doctype html><html><head><style>
body{margin:0;font:16px system-ui} #top{padding:40px} .row{display:flex;gap:24px;padding:24px}
.box{width:120px;height:80px;background:#ddd} #nest{padding:32px;background:#eef} .wrap{padding:16px} .inner{padding:8px}
</style></head><body>
<section id="top"><h1>Layers Page</h1><div class="row"><div class="box" id="b1"></div><div class="box" id="b2"></div></div></section>
<section id="nest"><div class="wrap"><div class="inner"><button id="deep">Deep</button></div></div></section>
<div hidden id="ghost"><span>Hidden</span></div>
<main>${cards}</main>
</body></html>`;
}

async function layersProject(page: Page) {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Layers Seed Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Layers Seed Page');
  await api.waitForRuns(project.id, 1);
  const main = project.directions[0];
  if (!main) throw new Error('no direction');
  writeFileSync(path.join(main.workTree, 'index.html'), layersPage());
  await expect(frontFrame(page).locator('h1')).toHaveText('Layers Page');
  await expect(page.locator('iframe.frame.back')).toHaveCount(0);
  await page.waitForTimeout(400);
  await expect(page.locator('iframe.frame.back')).toHaveCount(0);
  return api;
}

test('R2-4: the layers tree opens fast on a 1,000-node page; hover, click and arrows select in the preview', async ({ page }) => {
  await layersProject(page);
  const nodeCount = await frontFrame(page).locator('body *').count();
  expect(nodeCount).toBeGreaterThanOrEqual(1000);
  await focusStudio(page);
  await page.waitForTimeout(300);
  const openMs = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="Layers"]');
    if (!button) throw new Error('no layers button');
    const start = performance.now();
    button.click();
    return new Promise<number>((resolve) => {
      const check = () => (document.querySelector('.layers-row') ? resolve(performance.now() - start) : requestAnimationFrame(check));
      check();
    });
  });
  const rows = page.locator('.layers-row');
  expect(await rows.count()).toBeLessThan(80);
  await expect(page.locator('.layers-rows')).toHaveAttribute('style', /height/);

  const row = page.locator('.layers-row', { hasText: '#b2' });
  await row.hover();
  await expect(page.locator('.overlay .box.hover')).toHaveCount(1);
  const b2 = await frontFrame(page).locator('#b2').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const clickMs = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let start = 0;
      const rowEl = Array.from(document.querySelectorAll<HTMLElement>('.layers-row')).find((el) => el.textContent?.includes('#b2'));
      if (!rowEl) throw new Error('no row');
      const observer = new MutationObserver(() => {
        if (document.querySelector('.overlay .box.selected')) {
          observer.disconnect();
          resolve(performance.now() - start);
        }
      });
      observer.observe(document.querySelector('.overlay') as Node, { childList: true, subtree: true });
      start = performance.now();
      rowEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }));
    });
  });
  const selected = page.locator('.overlay .box.selected');
  await expect(selected).toHaveAttribute('style', new RegExp(`left: ${b2.x}px; top: ${b2.y}px; width: ${b2.width}px`));
  await expect(page.locator('.layers-row.selected')).toContainText('#b2');
  await expect(page.locator('.chip')).toContainText('div');

  await page.locator('.layers-list').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.layers-row.selected')).toContainText('#b1');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.layers-row.selected')).toContainText('.row');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.layers-row.selected')).toContainText('.row');
  await expect(page.locator('.layers-row', { hasText: '#b1' })).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.layers-row', { hasText: '#b1' })).toHaveCount(1);

  await page.locator('.layers-row', { hasText: '#ghost' }).click();
  await expect(page.locator('.layers-row.selected')).toHaveClass(/is-hidden/);
  await expect(page.locator('.chip')).toContainText('div');

  await page.locator('.layers-list').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.locator('.layers-row').last()).toBeVisible();
  console.log(`R2-4 ${JSON.stringify({ nodes: nodeCount, openMs: Math.round(openMs), clickMs: Math.round(clickMs * 10) / 10 })}`);
  expect(openMs).toBeLessThan(150);
  expect(clickMs).toBeLessThan(50);
});

test('R2-5: Enter, Shift+Enter and Tab move the selection, with focus in the preview', async ({ page }) => {
  await layersProject(page);
  await setSelectMode(page, true);
  const nest = await frontFrame(page).locator('#nest').boundingBox();
  if (!nest) throw new Error('no section');
  await page.mouse.click(nest.x + 8, nest.y + 8);
  await expect(page.locator('.chip')).toContainText('section');
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Enter');
  await expect(page.locator('.chip')).toContainText('button');
  await expect(page.locator('.chip')).toContainText('Deep');
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.chip')).toContainText('div');

  await focusStudio(page);
  await frontFrame(page).locator('#b1').click();
  const b1Box = await frontFrame(page).locator('#b1').boundingBox();
  await expect.poll(async () => Math.abs(((await page.locator('.overlay .box.selected').boundingBox())?.x ?? 0) - (b1Box?.x ?? 0))).toBeLessThanOrEqual(2);
  await focusStudio(page);
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Tab');
  const b2 = await frontFrame(page).locator('#b2').boundingBox();
  await expect.poll(async () => Math.abs(((await page.locator('.overlay .box.selected').boundingBox())?.x ?? 0) - (b2?.x ?? 0))).toBeLessThanOrEqual(2);
  await page.keyboard.press('Shift+Tab');
  const b1 = await frontFrame(page).locator('#b1').boundingBox();
  await expect.poll(async () => Math.abs(((await page.locator('.overlay .box.selected').boundingBox())?.x ?? 0) - (b1?.x ?? 0))).toBeLessThanOrEqual(2);
});

test('R2-6: Alt over another element shows distances that match getBoundingClientRect', async ({ page }) => {
  await layersProject(page);
  await setSelectMode(page, true);
  await frontFrame(page).locator('#b1').click();
  await expect(page.locator('.overlay .box.selected')).toHaveAttribute('style', /width: 120px; height: 80px/);
  const rects = await frontFrame(page).locator('body').evaluate(() => {
    const r = (id: string) => (document.getElementById(id) as HTMLElement).getBoundingClientRect();
    const b1 = r('b1');
    const b2 = r('b2');
    const row = (document.querySelector('.row') as HTMLElement).getBoundingClientRect();
    return { gap: b2.left - b1.right, insetTop: b1.top - row.top, insetLeft: b1.left - row.left, insetBottom: row.bottom - b1.bottom };
  });
  const b2 = await frontFrame(page).locator('#b2').boundingBox();
  if (!b2) throw new Error('no b2');
  await page.keyboard.down('Alt');
  await page.mouse.move(b2.x + 20, b2.y + 20);
  await page.mouse.move(b2.x + 24, b2.y + 24);
  const labels = page.locator('[data-testid="measure"] .measure-label');
  await expect(labels).toHaveCount(1);
  expect(Math.abs(Number(await labels.first().getAttribute('data-value')) - rects.gap)).toBeLessThanOrEqual(1);
  expect(Math.abs(Number(await labels.first().innerText()) - rects.gap)).toBeLessThanOrEqual(1);

  const row = await frontFrame(page).locator('.row').boundingBox();
  if (!row) throw new Error('no row');
  await page.mouse.move(row.x + row.width - 6, row.y + row.height - 6);
  await expect(labels).toHaveCount(4);
  const readValues = async () => (await labels.evaluateAll((els) => els.map((el) => Math.round(Number(el.getAttribute('data-value')))))).sort((a, b) => a - b);
  await expect.poll(readValues).toEqual(expect.arrayContaining([rects.insetTop, rects.insetLeft, rects.insetBottom].map(Math.round)));
  const values = await readValues();
  await page.keyboard.up('Alt');
  await page.mouse.move(row.x + row.width - 8, row.y + row.height - 8);
  await expect(page.locator('[data-testid="measure"]')).toHaveCount(0);
  console.log(`R2-6 ${JSON.stringify({ rects, labels: values })}`);
});

test('R2-7: Z+click zooms in 2x around the cursor; Z+Alt+click zooms out', async ({ page }) => {
  const api = await openHome(page);
  await createProjectViaUi(page, api, 'Z Click Page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Z Click Page');
  await focusStudio(page);
  await page.keyboard.press('Shift+Digit0');
  await expect.poll(() => currentZoom(page)).toBe(1);
  const stage = await box(page, '.stage');
  const at = { x: stage.x + stage.width * 0.3, y: stage.y + stage.height * 0.4 };
  const artboard = await box(page, '.artboard');
  const design = { x: at.x - artboard.x, y: at.y - artboard.y };
  await page.keyboard.down('KeyZ');
  await expect(page.locator('.stage')).toHaveClass(/zoom-in/);
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => currentZoom(page)).toBe(2);
  const zoomed = await box(page, '.artboard');
  expect(Math.abs(zoomed.x + design.x * 2 - at.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(zoomed.y + design.y * 2 - at.y)).toBeLessThanOrEqual(1);
  await page.keyboard.down('Alt');
  await page.mouse.click(at.x, at.y);
  await page.keyboard.up('Alt');
  await page.keyboard.up('KeyZ');
  await expect.poll(() => currentZoom(page)).toBe(1);
  await expect(page.locator('.stage')).not.toHaveClass(/zoom-in/);
});
