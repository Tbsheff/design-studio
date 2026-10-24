import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4970';
const out = path.resolve(process.argv[2] ?? '/tmp/polish-r1');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`), fullPage });
  console.log(`${prefix}-${name}.png`);
}

async function token(page: Page): Promise<string> {
  return (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(base);
  await page.getByRole('heading', { name: 'New project' }).waitFor();
  await shot(page, 'home-first-run', true);

  await page.getByLabel('Describe the design').fill('Bakery landing page');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('heading', { name: 'A few quick questions' }).waitFor();
  await page.locator('.clarify-q').first().getByRole('button').first().click();
  await shot(page, 'home-questions');
  await page.keyboard.press('Escape');

  await page.getByLabel('Describe the design').fill('');
  await page.getByLabel('Describe the design').focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'https://example.com/pricing');
    document.querySelector('[aria-label="Describe the design"]')?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.setInputFiles('input[type="file"]', { name: 'moodboard.png', mimeType: 'image/png', buffer: PNG_1PX });
  await page.getByLabel('Describe the design').fill('A pricing page like this reference, with a calmer palette');
  await shot(page, 'home-chips');

  const studioToken = await token(page);
  const call = (route: string, body: unknown) => page.evaluate(async ([r, b, t]) => (await fetch(r as string, { method: 'POST', headers: { 'x-studio-token': t as string, 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [route, body, studioToken] as const);
  for (const starterId of ['landing', 'dashboard', 'docs', 'form', 'mobile-app', 'deck']) await call('/api/projects/from-starter', { starterId });
  await call('/api/projects/sample', {});
  await page.goto(base);
  await page.locator('.project-thumb img').nth(5).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.locator('#projects-heading').scrollIntoViewIfNeeded();
  await shot(page, 'home-projects');
  await shot(page, 'home-projects-full', true);

  const card = page.locator('.project-card').first();
  await card.hover();
  await card.getByRole('button', { name: /More actions/ }).click();
  await shot(page, 'home-card-menu');
  await page.keyboard.press('Escape');

  await page.keyboard.press('/');
  await page.keyboard.type('doc');
  await shot(page, 'home-search');
  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
