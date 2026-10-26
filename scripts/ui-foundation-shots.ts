import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4870';
const sheet = process.env.SHEET_URL;
const out = path.resolve(process.argv[2] ?? '/tmp/ui-foundation');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`), fullPage });
  console.log(`${prefix}-${name}.png`);
}

async function openProject(page: Page): Promise<void> {
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  const project = await page.evaluate(
    async (t) => (await fetch('/api/projects/from-starter', { method: 'POST', headers: { 'x-studio-token': t, 'content-type': 'application/json' }, body: JSON.stringify({ starterId: 'landing' }) })).json(),
    token,
  );
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${project.project.id as string}"] .project-open`).click();
  await page.locator('iframe.frame.front').waitFor();
  await page.frameLocator('iframe.frame.front').locator('h1').first().waitFor();
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const theme of ['dark', 'light'] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript((value) => localStorage.setItem('design-studio.theme', value), theme);
    const page = await context.newPage();
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await shot(page, `home-${theme}`);
    await openProject(page);
    await shot(page, `studio-${theme}`);
    if (sheet) {
      await page.goto(`${sheet}?theme=${theme}`);
      await page.waitForLoadState('networkidle');
      await shot(page, `primitives-${theme}`, true);
    }
    await context.close();
  }
  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
