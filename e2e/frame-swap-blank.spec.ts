import { expect, test, type Page } from '@playwright/test';
import type { Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, openHome, selectInFrame } from './support/studio';

const SAMPLE_MS = 6000;
const TICK_MS = 50;
const SLOW_FONTS_MS = 3000;
const TITLE = 'Swap Blank Journal';
const COMMITTED = '#ff6d00';

interface Sample {
  t: number;
  src: string | null;
  painted: boolean;
  blank: boolean;
}

async function openPackProject(page: Page, api: StudioApi): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: TITLE, kind: 'html', packId: 'editorial' });
  await api.waitForRuns(project.id, 1);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  return api.project(project.id);
}

async function slowGoogleFonts(page: Page): Promise<{ slow: () => void }> {
  let delay = 0;
  await page.context().route(/fonts\.googleapis\.com/, async (route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ status: 200, contentType: 'text/css', headers: { 'cache-control': 'no-store' }, body: 'body{}' });
  });
  return { slow: () => (delay = SLOW_FONTS_MS) };
}

async function trackPainted(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const painted = new WeakSet<object>();
    window.addEventListener('message', (event) => {
      const data = event.data as { ns?: string; type?: string } | null;
      if (data?.ns === 'studio' && data.type === 'painted' && event.source) painted.add(event.source);
    });
    (window as unknown as { __framePainted: (w: Window | null) => boolean }).__framePainted = (w) => w !== null && painted.has(w);
  });
}

async function isBlank(page: Page, png: Buffer): Promise<boolean> {
  return page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 16) {
      const lum = (data[i]! * 3 + data[i + 1]! * 6 + data[i + 2]!) / 10;
      min = Math.min(min, lum);
      max = Math.max(max, lum);
    }
    return max - min < 24;
  }, png.toString('base64'));
}

async function sample(page: Page, start: number): Promise<Sample | null> {
  const info = await page.evaluate(() => {
    const el = document.querySelector<HTMLIFrameElement>('iframe.frame.front');
    const painted = (window as unknown as { __framePainted: (w: Window | null) => boolean }).__framePainted;
    return { src: el?.src ?? null, painted: el ? painted(el.contentWindow) : false };
  });
  const box = await page.locator('iframe.frame.front').boundingBox().catch(() => null);
  if (!box) return info.src === null ? { t: Date.now() - start, ...info, blank: true } : null;
  const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: Math.min(box.width, 600), height: Math.min(box.height, 400) } });
  return { t: Date.now() - start, ...info, blank: await isBlank(page, png) };
}

async function watchFrames(page: Page, action: () => Promise<void>): Promise<Sample[]> {
  const samples: Sample[] = [];
  const start = Date.now();
  const acted = action();
  while (Date.now() - start < SAMPLE_MS) {
    const tickAt = Date.now();
    const next = await sample(page, start);
    if (next) samples.push(next);
    const wait = TICK_MS - (Date.now() - tickAt);
    if (wait > 0) await page.waitForTimeout(wait);
  }
  await acted;
  return samples;
}

function expectNoBlank(name: string, samples: Sample[]): void {
  expect(new Set(samples.map((s) => s.src)).size, `${name} should reload the frame`).toBeGreaterThan(1);
  const bad = samples.filter((s) => s.blank || !s.painted).map(({ t, painted, blank }) => ({ t, painted, blank }));
  expect(bad, `${name}: the visible frame was blank or unpainted`).toEqual([]);
}

test('token commit and version undo keep the old frame until the reload paints, with slow Google Fonts', async ({ page }) => {
  const fonts = await slowGoogleFonts(page);
  await trackPainted(page);
  const api = await openHome(page);
  await openPackProject(page, api);
  await expect(frontFrame(page).locator('h1')).toHaveText(TITLE);

  await page.getByRole('tab', { name: /^Tokens/ }).click();
  const input = page.locator('li.tkp-row[data-token="--primary"]').getByLabel('--primary value', { exact: true });
  await input.fill(COMMITTED);
  await expect(page.locator('.tkp-count')).toHaveText('1 change');
  await page.waitForTimeout(500);
  fonts.slow();

  const commit = await watchFrames(page, () => page.getByRole('button', { name: 'Commit', exact: true }).click());
  await expect(page.locator('.tkp-footer')).toHaveCount(0);
  expectNoBlank('commit', commit);

  await page.locator('.tkp-title').click();
  const undo = await watchFrames(page, () => page.keyboard.press('ControlOrMeta+z'));
  await expect(input).not.toHaveValue(COMMITTED);
  expectNoBlank('undo', undo);
  await expect(frontFrame(page).locator('h1')).toHaveText(TITLE);
});

test('direct style edit keeps the old frame until the reload paints, with slow Google Fonts', async ({ page }) => {
  const fonts = await slowGoogleFonts(page);
  await trackPainted(page);
  const api = await openHome(page);
  await openPackProject(page, api);
  await expect(frontFrame(page).locator('h1')).toHaveText(TITLE);
  await selectInFrame(page, 'h1');
  const color = page.getByLabel('Text color', { exact: true });
  await page.waitForTimeout(500);
  fonts.slow();

  const edit = await watchFrames(page, async () => {
    await color.fill('#c2410c');
    await color.press('Enter');
  });
  expectNoBlank('direct edit', edit);
  await expect(frontFrame(page).locator('h1')).toHaveCSS('color', 'rgb(194, 65, 12)');
});
