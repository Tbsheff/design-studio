import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4970';
const out = path.resolve(process.argv[2] ?? '/tmp/polish-r6');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

const SHORT = { timeout: 8000 };
let debugPage: Page | null = null;

async function shot(page: Page, name: string, target?: Locator): Promise<void> {
  await page.waitForTimeout(600);
  const file = path.join(out, `${prefix}-${name}.png`);
  if (target) await target.screenshot({ path: file });
  else await page.screenshot({ path: file });
  console.log(path.basename(file));
}

async function step(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.log(`skip ${name}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    if (process.env.SHOTS_DEBUG) await debugPage?.screenshot({ path: path.join(out, `debug-${name}.png`) });
  }
}

async function call<T>(page: Page, token: string, method: string, url: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ t, m, u, b }) => {
      const res = await fetch(u, { method: m, headers: { 'x-studio-token': t, 'content-type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) });
      return res.json();
    },
    { t: token, m: method, u: url, b: body },
  ) as Promise<T>;
}

const SHOT_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Harbor Coffee</title><link rel="stylesheet" href="design-system/tokens.css">
<style>
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-body); }
header { display: flex; justify-content: space-between; align-items: center; padding: 24px 64px; border-bottom: 1px solid var(--border); }
.hero { padding: 96px 64px 64px; max-width: 760px; }
h1 { font-family: var(--font-display); font-size: 64px; line-height: 1.05; margin: 0 0 24px; }
.lede { color: var(--fg-muted); font-size: 20px; line-height: 1.5; }
.cta { display: inline-block; margin-top: 24px; padding: 14px 22px; border-radius: 10px; background: var(--primary); color: #ff0001; font-weight: 600; text-decoration: none; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 0 64px 96px; }
.card { padding: 24px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); }
.card h3 { margin: 0 0 8px; font-family: var(--font-display); font-size: 24px; }
.card p { margin: 0; color: var(--fg-muted); }
</style></head>
<body>
<header><strong>Harbor Coffee</strong><nav>Shop · Subscribe · Visit</nav></header>
<section class="hero"><h1>Small-batch coffee, roasted on the pier.</h1><p class="lede">Fresh bags every Tuesday. Pause or skip any week.</p><a class="cta" href="#">Start a subscription</a></section>
<section class="cards">
<article class="card"><h3>Pier Blend</h3><p>Chocolate, orange peel, a long finish.</p></article>
<article class="card"><h3>Fog Line</h3><p>Light roast with stone fruit and honey.</p></article>
<article class="card"><h3>Night Shift</h3><p>Dark, smoky and built for milk.</p></article>
</section>
</body>
</html>
`;

const frame = (page: Page) => page.frameLocator('iframe.frame.front');

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  debugPage = page;
  await page.goto(base);
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  await page.evaluate(() => localStorage.clear());
  const created = await call<{ project: { id: string; directions: { workTree: string }[] } }>(page, token, 'POST', '/api/projects', { prompt: 'Harbor Coffee', kind: 'html', packId: 'editorial', startRun: false });
  const pid = created.project.id;
  writeFileSync(path.join(created.project.directions[0]!.workTree, 'index.html'), SHOT_PAGE);
  await call(page, token, 'POST', `/api/projects/${pid}/d/main/keep`);
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${pid}"] .project-open`).click();
  await page.locator('iframe.frame.front').waitFor();
  await frame(page).locator('h1').first().waitFor();

  await step('studio', async () => {
    await page.mouse.move(10, 400);
    await shot(page, 'studio');
    await shot(page, 'canvas-toolbar', page.locator('.toolbar').first());
  });
  await step('tokens', async () => {
    await page.getByRole('tab', { name: /^Tokens/ }).click(SHORT);
    await page.locator('.tkp').first().waitFor(SHORT);
    await shot(page, 'tokens-panel');
  });
  await step('dark', async () => {
    const dark = page.getByRole('button', { name: 'Preview dark mode' });
    if ((await dark.count()) === 0) throw new Error('no canvas theme switch');
    await dark.click(SHORT);
    await shot(page, 'canvas-dark');
    await dark.click(SHORT);
  });
  await step('components', async () => {
    const tab = page.getByRole('tab', { name: /^Components/ });
    if ((await tab.count()) === 0) throw new Error('no Components tab');
    await tab.click(SHORT);
    await page.locator('.cmp-thumb img').first().waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'Mention Card' }).click();
    await shot(page, 'components-panel');
  });
  await step('inspector', async () => {
    await page.getByRole('button', { name: 'Select', exact: true }).click(SHORT);
    await page.waitForTimeout(500);
    const target = frame(page).locator('.cta').first();
    const box = await target.boundingBox();
    if (!box) throw new Error('h1 has no box');
    await page.mouse.click(box.x + 4, box.y + 4);
    await page.locator('.overlay .box.selected').first().waitFor(SHORT);
    await page.getByRole('tab', { name: /^Design/ }).click(SHORT);
    await page.locator('.inspector').first().waitFor(SHORT);
    await page.mouse.move(720, 880);
    await shot(page, 'inspector');
    await page.keyboard.press('Escape');
  });
  await step('design-md', async () => {
    await page.getByRole('button', { name: 'DESIGN.md', exact: true }).click(SHORT);
    await page.locator('dialog.modal[open]').waitFor(SHORT);
    await shot(page, 'design-md');
    const editor = page.getByLabel('DESIGN.md content');
    await editor.press('End');
    await editor.type('\n\n## Extra\nA new note.');
    await page.getByRole('button', { name: 'Close DESIGN.md' }).click(SHORT);
    await shot(page, 'design-md-guard');
    await page.keyboard.press('Escape');
  });
  await step('library', async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(base);
    await page.getByRole('button', { name: 'Design systems' }).first().click(SHORT);
    await page.locator('.lib-card').first().waitFor(SHORT);
    await shot(page, 'library');
    await page.locator('.lib-card').first().click(SHORT);
    await page.locator('dialog[open]').first().waitFor(SHORT);
    await shot(page, 'pack-detail');
  });
  await browser.close();
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
