import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { differenceEuclidean, parse } from 'culori';
import type { DesignSystemState, Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, mainDirection, openHome } from './support/studio';

const deltaE = differenceEuclidean('oklab');

function near(color: string, target: string, limit = 0.02): boolean {
  const a = parse(color);
  const b = parse(target);
  return Boolean(a && b) && deltaE(a!, b!) < limit;
}

async function openPackProject(page: Page, api: StudioApi, name: string, packId = 'editorial'): Promise<Project> {
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: name, kind: 'html', packId });
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

function treeHash(root: string): string {
  const hash = createHash('sha256');
  const walk = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name === '.git') continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else hash.update(`${path.relative(root, full)}\n`).update(readFileSync(full));
    }
  };
  walk(root);
  return hash.digest('hex');
}

const PROBE_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Probe</title><link rel="stylesheet" href="design-system/tokens.css"></head>
<body style="margin:0;background:var(--bg);color:var(--fg)">
<main id="probe" style="padding:24px;background:var(--bg);color:var(--fg)"><h1>Mode probe</h1><p style="color:var(--primary)">Primary text</p></main>
</body>
</html>
`;

async function previewFrames(page: Page): Promise<Frame[]> {
  const handles = await page.locator('iframe.frame.front, .canvas-frame iframe.frame.passive').elementHandles();
  const frames = await Promise.all(handles.map((handle) => handle.contentFrame()));
  return frames.filter((frame): frame is Frame => frame !== null);
}

test('R6-1: the canvas dark switch repaints every frame in under 100 ms and leaves the source as it was', async ({ page }) => {
  const api = await openHome(page);
  const project = await openPackProject(page, api, 'Mode Preview Page');
  const main = mainDirection(project);
  writeFileSync(path.join(main.workTree, 'index.html'), PROBE_PAGE);
  await expect(frontFrame(page).locator('h1')).toHaveText('Mode probe');
  await api.call('POST', `/api/projects/${project.id}/d/main/keep`).catch(() => undefined);
  for (const size of ['Tablet 768', 'Mobile 390']) {
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(size) }).click();
  }
  await expect(page.locator('.canvas-frame iframe.frame.passive')).toHaveCount(2);
  await page.locator('.stage').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+Digit1');
  const state = await api.call<DesignSystemState>('GET', `/api/projects/${project.id}/d/main/design-system`);
  const bg = state.entries.find((entry) => entry.cssVar === '--bg')!;
  expect(bg.darkValue).toBeTruthy();

  let frames: Frame[] = [];
  await expect
    .poll(async () => {
      frames = await previewFrames(page);
      const ready = await Promise.all(frames.map((frame) => frame.locator('#probe').count().catch(() => 0)));
      return ready.filter((count) => count > 0).length;
    })
    .toBe(3);
  await page.waitForTimeout(400);
  for (const frame of frames) {
    const color = await frame.locator('#probe').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(near(color, bg.value)).toBe(true);
  }

  const before = treeHash(main.workTree);
  const versionsBefore = (await api.versions(project.id, 'main')).length;
  const toggle = page.getByRole('button', { name: 'Preview dark mode' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  const watch = (frame: Frame) =>
    frame.evaluate(() => {
      const el = document.getElementById('probe')!;
      const start = getComputedStyle(el).backgroundColor;
      const w = window as unknown as { __flip?: number };
      delete w.__flip;
      const tick = () => {
        if (getComputedStyle(el).backgroundColor !== start) {
          requestAnimationFrame(() => {
            w.__flip = Date.now();
          });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const samples: number[] = [];
  for (let round = 0; round < 4; round += 1) {
    await Promise.all(frames.map(watch));
    const clickedAt = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('button[aria-label="Preview dark mode"]')!;
      const at = Date.now();
      button.click();
      return at;
    });
    const flips: number[] = [];
    for (const frame of frames) {
      await expect.poll(() => frame.evaluate(() => (window as unknown as { __flip?: number }).__flip ?? null)).not.toBeNull();
      flips.push(await frame.evaluate(() => (window as unknown as { __flip: number }).__flip));
    }
    const worst = Math.max(...flips) - clickedAt;
    samples.push(worst);
    const dark = round % 2 === 0;
    await expect(toggle).toHaveAttribute('aria-pressed', String(dark));
    for (const frame of frames) {
      const color = await frame.locator('#probe').evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(near(color, dark ? bg.darkValue! : bg.value)).toBe(true);
    }
  }
  console.log(`R6-1 repaint after click, slowest of 3 frames, ms: ${JSON.stringify(samples)}`);
  for (const sample of samples) expect(sample).toBeLessThan(100);

  await toggle.click();
  await page.getByRole('tab', { name: /^Tokens/ }).click();
  await expect(page.getByRole('group', { name: 'Preview theme' }).getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: 'Preview theme' }).getByRole('button', { name: 'Auto' }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  expect(treeHash(main.workTree)).toBe(before);
  expect((await api.versions(project.id, 'main')).length).toBe(versionsBefore);
});
