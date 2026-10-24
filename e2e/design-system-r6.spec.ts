import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { differenceEuclidean, parse } from 'culori';
import type { DesignSystemState, PackSummary, Project } from '../src/shared/contracts';
import { readState } from './support/server';
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

test('R6 open questions: save as new, problems notice, Apply after reload, Copy badge', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const api = await openHome(page);
  const stamp = Date.now().toString(36);
  const base = await api.call<PackSummary>('POST', '/api/packs/editorial/duplicate', { name: `Base ${stamp}` });
  const { project } = await api.call<{ project: Project }>('POST', '/api/projects', { kind: 'html', prompt: 'Save as new target', packId: base.id, startRun: false });
  await page.evaluate((id) => {
    const raw = localStorage.getItem('design-studio.ui.v1');
    localStorage.setItem('design-studio.ui.v1', JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), activeProjectId: id, screen: 'home' }));
  }, project.id);
  await page.reload();

  const chip = page.locator('.topbar').getByRole('button', { name: `Design system: Base ${stamp}` });
  await chip.click();
  await page.getByRole('dialog', { name: 'Design system' }).getByRole('button', { name: 'Save to library…' }).click();
  const save = page.getByRole('dialog', { name: 'Save to library' });
  await save.getByRole('radio', { name: 'Save as a new design system' }).check();
  await save.getByLabel('Design system name').fill(`Fork ${stamp}`);
  await save.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(save).toBeHidden();
  await expect(page.locator('.topbar').getByRole('button', { name: `Design system: Fork ${stamp}` })).toBeVisible();
  const packs = await api.call<PackSummary[]>('GET', '/api/packs');
  const fork = packs.find((pack) => pack.name === `Fork ${stamp}`);
  expect(fork?.id).toBe(`user-fork-${stamp}`);
  expect(packs.find((pack) => pack.id === base.id)?.name).toBe(`Base ${stamp}`);
  await expect.poll(async () => (await api.project(project.id)).packId).toBe(fork?.id);

  const broken = path.join(readState().dataDir, 'packs', `user-broken-${stamp}`);
  mkdirSync(broken, { recursive: true });
  writeFileSync(path.join(broken, 'pack.json'), '{"id": "nope"}');
  try {
    await page.locator('.topbar').getByRole('button', { name: `Design system: Fork ${stamp}` }).click();
    await page.getByRole('dialog', { name: 'Design system' }).getByRole('button', { name: 'Change design system…' }).click();
    await page.getByRole('button', { name: 'Manage…' }).click();
    await expect(page.getByRole('heading', { name: 'Design systems', level: 1 })).toBeVisible();
    const notice = page.locator('.lib-problems');
    await expect(notice.locator('summary')).toHaveText('1 design system could not load');
    await notice.locator('summary').click();
    await expect(notice).toContainText(`user-broken-${stamp}`);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Design systems', level: 1 })).toBeVisible();
    const yours = page.getByRole('region', { name: /^Yours/ });
    await expect(yours.getByRole('button', { name: `Base ${stamp}`, exact: true })).toContainText('Copy');
    await yours.getByRole('button', { name: `Base ${stamp}`, exact: true }).click();
    const detail = page.getByRole('dialog', { name: `Base ${stamp} design system`, exact: true });
    await detail.getByRole('button', { name: 'Apply to current project' }).click();
    await expect(page.locator('.topbar').getByRole('button', { name: `Design system: Base ${stamp}` })).toBeVisible();
    await expect.poll(async () => (await api.project(project.id)).packId).toBe(base.id);
  } finally {
    rmSync(broken, { recursive: true, force: true });
    for (const id of [base.id, fork?.id]) if (id) await api.call('DELETE', `/api/packs/${id}`).catch(() => undefined);
  }
});

test('R6-5: every built-in pack card shows its light and dark swatches side by side', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const api = await openHome(page);
  const builtins = (await api.call<PackSummary[]>('GET', '/api/packs')).filter((pack) => pack.source === 'builtin');
  await page.getByRole('button', { name: 'Design systems', exact: true }).click();
  const region = page.getByRole('region', { name: /^Built-in/ });
  for (const pack of builtins) {
    const modes = region.getByRole('button', { name: pack.name, exact: true }).getByTestId('mode-swatches');
    const light = modes.locator('.lib-mode.light');
    const dark = modes.locator('.lib-mode.dark');
    await expect(dark.locator('.swatch')).toHaveCount(6);
    if (pack.mode === 'dark') {
      await expect(light).toHaveCount(0);
      continue;
    }
    await expect(light.locator('.swatch')).toHaveCount(6);
    const [lightBox, darkBox] = [await light.boundingBox(), await dark.boundingBox()];
    expect(Math.abs((lightBox?.y ?? 0) - (darkBox?.y ?? 100))).toBeLessThan(2);
    expect((darkBox?.x ?? 0) - ((lightBox?.x ?? 0) + (lightBox?.width ?? 0))).toBeLessThan(1);
  }
});

test('R6-6: the DESIGN.md editor has an outline and a live preview, and asks to save on close', async ({ page }) => {
  const api = await openHome(page);
  const project = await openPackProject(page, api, 'Design Md Page');
  const file = path.join(project.directions[0]!.workTree, 'DESIGN.md');
  const before = readFileSync(file, 'utf8');
  await page.getByRole('button', { name: 'DESIGN.md', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'DESIGN.md', exact: true });
  const editor = dialog.getByLabel('DESIGN.md content');
  await expect(editor).not.toBeEmpty();
  const outline = dialog.getByRole('navigation', { name: 'Outline' });
  await expect(outline.getByRole('button').first()).toBeVisible();

  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially('\n\n## Review notes\n\nShip **bold** ideas.\n');
  await expect(outline.getByRole('button', { name: 'Review notes' })).toBeVisible();
  await expect(dialog.getByLabel('DESIGN.md preview').getByRole('heading', { name: 'Review notes' })).toBeVisible();
  await expect(dialog.getByLabel('DESIGN.md preview').locator('strong', { hasText: 'bold' })).toBeVisible();
  await outline.getByRole('button', { name: 'Review notes' }).click();
  expect(await editor.evaluate((el) => (el as HTMLTextAreaElement).value.slice((el as HTMLTextAreaElement).selectionStart).startsWith('## Review notes'))).toBe(true);

  const ask = dialog.getByRole('alertdialog', { name: 'Unsaved changes' });
  await dialog.getByRole('button', { name: 'Close DESIGN.md' }).click();
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'Keep editing' }).click();
  await expect(ask).toBeHidden();
  await expect(dialog).toBeVisible();
  await editor.press('Escape');
  await expect(ask).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ask).toBeHidden();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await ask.getByRole('button', { name: 'Discard' }).click();
  await expect(dialog).toBeHidden();
  expect(readFileSync(file, 'utf8')).toBe(before);

  await page.getByRole('button', { name: 'DESIGN.md', exact: true }).click();
  await expect(editor).not.toBeEmpty();
  await dialog.getByRole('button', { name: 'Close DESIGN.md' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'DESIGN.md', exact: true }).click();
  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially('\nOne more line.\n');
  await page.mouse.click(5, 5);
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => readFileSync(file, 'utf8')).toContain('One more line.');
});
