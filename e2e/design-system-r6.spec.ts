import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { differenceEuclidean, parse } from 'culori';
import type { DesignSystemState, Project } from '../src/shared/contracts';
import { type StudioApi, frontFrame, mainDirection, openHome, selectInFrame } from './support/studio';

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

const LINT_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Lint</title><link rel="stylesheet" href="design-system/tokens.css">
<style>
.cta { display: inline-block; padding: 12px 20px; background: var(--primary); color: #ff0001; border-radius: var(--radius-md); }
</style></head>
<body style="background:var(--bg);color:var(--fg)"><main><h1>Lint probe</h1><a class="cta" href="#">Start</a></main></body>
</html>
`;

test('R6-3: an off-palette color shows the nearest token with ΔE and Use token writes var()', async ({ page }) => {
  const api = await openHome(page);
  const project = await openPackProject(page, api, 'Lint Page');
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  writeFileSync(file, LINT_PAGE);
  await api.call('POST', `/api/projects/${project.id}/d/main/keep`);
  await expect(frontFrame(page).locator('h1')).toHaveText('Lint probe');
  await selectInFrame(page, '.cta');
  await page.getByRole('tab', { name: /^Design/ }).click();
  const row = page.getByTestId('token-lint').filter({ hasText: 'Text color' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('#ff0001');
  const hint = (await row.locator('.tk-lint-hint').textContent()) ?? '';
  const match = /Nearest is (--[a-z0-9-]+), ΔE (\d+\.\d)/.exec(hint);
  expect(match, hint).not.toBeNull();
  const cssVar = match![1]!;
  console.log(`R6-3 lint: ${hint}`);
  await row.getByRole('button', { name: `Use ${cssVar} for text color` }).click();
  await expect.poll(() => readFileSync(file, 'utf8')).toContain(`color: var(${cssVar})`);
  await expect(page.getByTestId('token-lint').filter({ hasText: 'Text color' })).toHaveCount(0);
});

const BUTTON_TSX = `import type { ReactNode } from 'react';

export function Button({ children }: { children: ReactNode }) {
  return <button className="inv-button" style={{ padding: '10px 18px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 0 }}>{children}</button>;
}
`;

const CARD_TSX = `import { Button } from './Button';

export function Card({ title }: { title: string }) {
  return (
    <article className="inv-card" style={{ width: 240, padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
      <h3>{title}</h3>
      <Button>Open</Button>
    </article>
  );
}
`;

const INVENTORY_APP = `import { Button } from './components/Button';
import { Card } from './components/Card';

export default function App() {
  return (
    <main style={{ padding: 32, display: 'flex', gap: 16 }}>
      <h1>Inventory probe</h1>
      <Card title="First" />
      <Card title="Second" />
      <Button>Start</Button>
    </main>
  );
}
`;

test('R6-2: the Components tab lists Button and Card with thumbnails and a click mentions the component', async ({ page }) => {
  const api = await openHome(page);
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { prompt: 'Inventory App', kind: 'react' });
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(await api.project(project.id));
  const components = path.join(main.workTree, 'src', 'components');
  mkdirSync(components, { recursive: true });
  writeFileSync(path.join(components, 'Button.tsx'), BUTTON_TSX);
  writeFileSync(path.join(components, 'Card.tsx'), CARD_TSX);
  writeFileSync(path.join(main.workTree, 'src', 'App.tsx'), INVENTORY_APP);
  await api.call('POST', `/api/projects/${project.id}/d/main/keep`);
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    const state = raw ? JSON.parse(raw) : {};
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...state, activeProjectId: id }));
  }, project.id);
  await page.reload();
  await expect(frontFrame(page).locator('h1')).toHaveText('Inventory probe', { timeout: 60_000 });

  await page.getByRole('tab', { name: /^Components/ }).click();
  const cards = page.getByTestId('component-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Button');
  await expect(cards.nth(0)).toContainText('2 uses');
  await expect(cards.nth(1)).toContainText('Card');
  for (const name of ['Button', 'Card']) {
    const img = page.getByRole('button', { name: `Mention ${name}` }).locator('img');
    await expect(img).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(20);
  }
  const buttonShot = await page.getByRole('button', { name: 'Mention Button' }).locator('img').evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]);
  const cardShot = await page.getByRole('button', { name: 'Mention Card' }).locator('img').evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]);
  expect(cardShot[1]!).toBeGreaterThan(buttonShot[1]!);

  await page.getByRole('button', { name: 'Mention Button' }).click();
  const chip = page.getByTestId('mention-chip');
  await expect(chip).toHaveCount(1);
  await expect(chip).toContainText('Button');
  await expect(chip).toHaveAttribute('title', '@Button · src/components/Button.tsx');
  await page.getByRole('button', { name: 'Mention Button' }).click();
  await expect(chip).toHaveCount(1);

  const composer = page.locator('[data-slot="composer-input"]');
  await composer.click();
  await composer.pressSequentially('Make @Ca');
  await expect(page.getByTestId('mention-list')).toContainText('Card');
  await page.keyboard.press('Enter');
  await expect(chip).toHaveCount(2);
  await composer.pressSequentially(' bigger');
  const sent = page.waitForRequest((request) => request.method() === 'POST' && /\/runs$/.test(new URL(request.url()).pathname));
  await page.keyboard.press('Meta+Enter');
  const body = (await sent).postDataJSON() as { mentions?: unknown[] };
  expect(body.mentions).toEqual([
    { kind: 'component', name: 'Button', file: 'src/components/Button.tsx', selector: expect.stringContaining('src/components/Button.tsx:') },
    { kind: 'component', name: 'Card', file: 'src/components/Card.tsx', selector: expect.stringContaining('src/components/Card.tsx:') },
  ]);
});
