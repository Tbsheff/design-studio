import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4970';
const out = path.resolve(process.argv[2] ?? '/tmp/polish-r2');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`) });
  console.log(`${prefix}-${name}.png`);
}

async function exists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
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
  await page.frameLocator('iframe.frame.front').locator('h1').first().waitFor();
  await shot(page, 'canvas');

  await page.getByRole('button', { name: /^Select/ }).click();
  await page.frameLocator('iframe.frame.front').locator('h1').first().click();
  await page.locator('.overlay .box.selected').first().waitFor();
  const frameBox = await page.locator('iframe.frame.front').boundingBox();
  if (frameBox) await page.mouse.move(frameBox.x + frameBox.width * 0.5, frameBox.y + Math.min(frameBox.height, 700) * 0.6);
  await shot(page, 'canvas-select');

  if (await exists(page, '[aria-label="Layers"]')) {
    await page.getByRole('button', { name: 'Layers', exact: true }).click();
    await page.locator('.layers-row').first().waitFor();
    await shot(page, 'canvas-layers');
  }

  if (await exists(page, '[aria-label="Add frame"]')) {
    for (const size of ['Tablet 768', 'Mobile 390']) {
      await page.getByRole('button', { name: 'Add frame', exact: true }).click();
      await page.getByRole('menuitem', { name: size }).click();
    }
    await page.keyboard.press('Shift+Digit1');
    await shot(page, 'canvas-frames');
    await page.getByRole('button', { name: 'Add frame', exact: true }).click();
    await shot(page, 'canvas-add-frame-menu');
    await page.keyboard.press('Escape');
  }

  await page.getByLabel('Zoom', { exact: true }).focus();
  await shot(page, 'canvas-toolbar');
  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
