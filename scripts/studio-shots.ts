import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4975';
const out = path.resolve(process.argv[2] ?? '/tmp/ui-studio');
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`${name}.png`);
}

async function openProject(page: Page): Promise<void> {
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  const created = await page.evaluate(
    async (t) => (await fetch('/api/projects/from-starter', { method: 'POST', headers: { 'x-studio-token': t, 'content-type': 'application/json' }, body: JSON.stringify({ starterId: 'landing' }) })).json(),
    token,
  );
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${created.project.id as string}"] .project-open`).click();
  await page.locator('iframe.frame.front').waitFor();
  await page.frameLocator('iframe.frame.front').locator('h1').first().waitFor();
}

async function send(page: Page, text: string): Promise<void> {
  const box = page.locator('.prompt textarea');
  await box.click();
  await box.fill(text);
  await page.keyboard.press('Meta+Enter');
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  for (const theme of ['dark', 'light'] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript((value) => {
      if (!sessionStorage.getItem('shots')) {
        localStorage.clear();
        sessionStorage.setItem('shots', '1');
      }
      localStorage.setItem('design-studio.theme', value);
    }, theme);
    const page = await context.newPage();
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await openProject(page);
    await shot(page, `studio-${theme}`);
    await send(page, '[slow] Make the hero calmer [steps] [todo]');
    await page.waitForTimeout(1800);
    await shot(page, `chat-running-${theme}`);
    await page.waitForFunction(() => !document.querySelector('.ui-status-mark:not(.idle)'), undefined, { timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    await shot(page, `chat-finished-${theme}`);
    await page.locator('.topbar-tools button', { hasText: 'Edit' }).click();
    await page.frameLocator('iframe.frame.front').locator('h1').first().click();
    await shot(page, `edit-${theme}`);
    await page.locator('.topbar-tools button', { hasText: 'Comment' }).click();
    await page.mouse.move(820, 420);
    await shot(page, `comment-${theme}`);
    await page.keyboard.press('Escape');
    await page.locator('.topbar-present').click();
    await shot(page, `present-menu-${theme}`);
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Tweak"]').click();
    await shot(page, `tweak-${theme}`);
    await page.keyboard.press('Escape');
    await page.locator('.pane-project').click();
    await shot(page, `project-menu-${theme}`);
    await page.keyboard.press('Escape');
    if (theme === 'dark') {
      await page.keyboard.press('c');
      await page.locator('.topbar-tools button', { hasText: 'Edit' }).click();
      await page.waitForTimeout(300);
      console.log('comment->edit mode:', await page.locator('.pane-left').getAttribute('data-mode'));
      await page.keyboard.press('Escape');
      await page.frameLocator('iframe.frame.front').locator('h1').first().click();
      await page.waitForTimeout(400);
      console.log('edit after Esc selection boxes:', await page.locator('.artboard [class*="sel"]').count());
      await shot(page, `edit-after-esc-${theme}`);
      await page.locator('[aria-label="Reload preview"]').click();
      await page.waitForTimeout(800);
      await page.locator('.topbar-present').click();
      await page.getByRole('menuitem', { name: 'In this window' }).click();
      await shot(page, `present-${theme}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log('present closed:', (await page.locator('.present-layer').count()) === 0);
    }
    await context.close();
  }
  await browser.close();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
