import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4970';
const out = path.resolve(process.argv[2] ?? '/tmp/polish-r4');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`) });
  console.log(`${prefix}-${name}.png`);
}

async function step(name: string, run: () => Promise<void>): Promise<boolean> {
  try {
    await run();
    return true;
  } catch (error) {
    console.log(`skip ${name}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    return false;
  }
}

const frame = (page: Page) => page.frameLocator('iframe.frame.front');
const SHORT = { timeout: 5000 };

async function selectInFrame(page: Page, target: Locator, modifiers?: Array<'Shift'>, corner = true): Promise<void> {
  await target.waitFor(SHORT);
  await target.scrollIntoViewIfNeeded(SHORT);
  const box = await target.boundingBox();
  if (!box) throw new Error('target has no box');
  const x = corner ? box.x + 3 : box.x + box.width / 2;
  const y = corner ? box.y + 3 : box.y + box.height / 2;
  for (const key of modifiers ?? []) await page.keyboard.down(key);
  await page.mouse.click(x, y);
  for (const key of modifiers ?? []) await page.keyboard.up(key);
  await page.locator('.overlay .box.selected').first().waitFor(SHORT);
}

async function openInspector(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: /^Design/ });
  await tab.click(SHORT);
  await page.locator('.inspector').first().waitFor(SHORT);
}

async function clearSelection(page: Page): Promise<void> {
  await page.mouse.click(700, 150);
  await page.locator('.overlay .box.selected').first().waitFor({ state: 'detached', timeout: 2000 }).catch(() => undefined);
  await page.mouse.move(10, 10);
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(base);
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  await page.evaluate(() => localStorage.clear());
  const project = await page.evaluate(
    async (t) => (await fetch('/api/projects/from-starter', { method: 'POST', headers: { 'x-studio-token': t, 'content-type': 'application/json' }, body: JSON.stringify({ starterId: 'landing' }) })).json(),
    token,
  );
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${project.project.id as string}"] .project-open`).click();
  await page.locator('iframe.frame.front').waitFor();
  await frame(page).locator('h1').first().waitFor();

  const selectMode = await step('select mode', async () => {
    await page.getByRole('button', { name: /^Select/ }).click(SHORT);
  });
  if (!selectMode) {
    await browser.close();
    return;
  }
  const h1 = frame(page).locator('h1').first();

  if (await step('inspector-h1', async () => {
    await selectInFrame(page, h1);
    await openInspector(page);
    await page.mouse.move(720, 880);
  })) await shot(page, 'inspector-h1');

  if (await step('inspector-card', async () => {
    const container = frame(page).locator('section, main > div, div').filter({ has: page.frameLocator('iframe.frame.front').locator('h1, h2, h3, p, a, button') }).filter({ hasNot: h1 }).first();
    await container.waitFor(SHORT);
    await container.scrollIntoViewIfNeeded();
    const box = await container.boundingBox();
    if (!box) throw new Error('container has no box');
    await page.mouse.click(box.x + 3, box.y + 3);
    await page.locator('.overlay .box.selected').first().waitFor(SHORT);
    await openInspector(page);
    await page.mouse.move(720, 880);
  })) {
    await shot(page, 'inspector-card');
    if (await step('inspector-card-bottom', async () => {
      const scrolled = await page.locator('.inspector').first().evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        while (node) {
          if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
            node.scrollTop = node.scrollHeight;
            return true;
          }
          node = node.parentElement;
        }
        return false;
      });
      if (!scrolled) console.log('note inspector-card-bottom: inspector does not scroll, shooting as is');
    })) await shot(page, 'inspector-card-bottom');
  }

  await step('layers', async () => {
    await clearSelection(page);
    await selectInFrame(page, h1);
    await page.getByRole('button', { name: 'Layers', exact: true }).click(SHORT);
    await page.locator('.layers-row').first().waitFor(SHORT);
    await page.mouse.move(720, 880);
    await shot(page, 'layers');
    await page.getByRole('button', { name: 'Layers', exact: true }).click(SHORT);
    await page.locator('.layers-row').first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => undefined);
  });

  await step('canvas-selected', async () => {
    await clearSelection(page);
    await selectInFrame(page, h1);
    await page.mouse.move(720, 880);
    await shot(page, 'canvas-selected');
  });

  await step('inspector-multi', async () => {
    await clearSelection(page);
    await selectInFrame(page, h1);
    const layersButton = page.getByRole('button', { name: 'Layers', exact: true });
    await layersButton.click(SHORT);
    const rows = page.locator('.layers-row');
    await rows.nth(1).waitFor(SHORT);
    const selectedRow = page.locator('.layers-row.selected').first();
    const rowCount = await rows.count();
    const target = rows.filter({ hasNot: page.locator('.selected') }).nth(Math.min(2, rowCount - 2));
    await target.click({ modifiers: ['Shift'], timeout: 5000 });
    await selectedRow.waitFor(SHORT);
    const selectedCount = await page.locator('.layers-row.selected').count();
    if (selectedCount < 2) throw new Error(`multi-select not available, ${selectedCount} layer row selected`);
    await layersButton.click(SHORT);
    await openInspector(page);
    await page.mouse.move(720, 880);
    await shot(page, 'inspector-multi');
  });

  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
