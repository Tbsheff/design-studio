import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4370';
const out = path.resolve(process.argv[2] ?? '/tmp/premium-inputs');
const parentPath = process.argv[3] ?? '/tmp/ps-projects';
mkdirSync(out, { recursive: true });

type Theme = 'light' | 'dark';

async function shot(page: Page, theme: Theme, name: string): Promise<void> {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, `${theme}-${name}.png`) });
  console.log(`${theme}-${name}.png`);
}

function front(page: Page) {
  return page.frameLocator('iframe.frame.front');
}

async function api<T>(page: Page, method: string, url: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, url, body }) => {
      const token = document.querySelector<HTMLMetaElement>('meta[name="studio-token"]')?.content ?? '';
      const res = await fetch(url, {
        method,
        headers: {
          'x-studio-token': token,
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return res.json();
    },
    { method, url, body },
  ) as Promise<T>;
}

async function openProject(page: Page, theme: Theme): Promise<{ id: string; did: string }> {
  await page.goto(base);
  await page.evaluate((t) => window.localStorage.setItem('design-studio.theme', t), theme);
  const { project } = await api<{
    project: { id: string; directions: { id: string }[] };
  }>(page, 'POST', '/api/projects/sample', { parentPath });
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${project.id}"] .project-open`).click();
  await front(page).locator('h1').first().waitFor();
  await page.waitForTimeout(800);
  const did = project.directions[0]?.id ?? 'main';
  return { id: project.id, did };
}

async function run(theme: Theme, browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const { id, did } = await openProject(page, theme);
  const compose = page.getByTestId('comment-compose');
  const area = compose.locator('textarea');

  await page
    .getByRole('button', { name: /^Comment/ })
    .first()
    .click();
  await front(page).locator('h1').first().click();
  await compose.waitFor();
  await shot(page, theme, '1-empty');

  await area.pressSequentially('Make this headline tighter and warmer.');
  await area.press('Shift+Enter');
  await area.pressSequentially('Try the serif at 64 px with less tracking,');
  await area.press('Shift+Enter');
  await area.pressSequentially('and keep the second line in italics.');
  await shot(page, theme, '2-typing');

  await area.pressSequentially(' @');
  await page.getByTestId('mention-list').waitFor();
  await shot(page, theme, '3-mentions');
  await area.press('Escape');
  await area.press('Escape');

  await front(page).locator('p').first().click();
  await compose.waitFor();
  const label = compose.getByRole('checkbox', { name: 'Send to Claude' });
  if (await label.isChecked()) await label.uncheck();
  await compose.locator('textarea').pressSequentially('Shorter intro. Two sentences max.');
  await compose.locator('textarea').press('Enter');
  await page.getByTestId('comment-pin').first().waitFor();
  const comments = await api<{ id: string }[]>(page, 'GET', `/api/projects/${id}/d/${did}/comments`);
  const first = comments[0];
  if (first) {
    await api(page, 'POST', `/api/projects/${id}/d/${did}/comments/${first.id}/replies`, { text: 'Agree, and drop the second clause.' });
    await api(page, 'POST', `/api/projects/${id}/d/${did}/comments/${first.id}/replies`, { text: 'Keep “72 hours”, it sells.' });
  }
  await page
    .getByRole('button', { name: /^Comment/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  await shot(page, theme, '4-pin-with-replies');
  await page.getByTestId('comment-pin').first().click();
  await page.getByTestId('comment-open').waitFor();
  await shot(page, theme, '5-thread');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Comments/ }).click();
  await shot(page, theme, '7-comments-panel');

  await page
    .getByRole('button', { name: /^Comment/ })
    .first()
    .click();
  await front(page).locator('h1').first().click();
  await compose.waitFor();
  if (!(await label.isChecked())) await label.check();
  await compose.locator('textarea').fill('');
  await compose.locator('textarea').pressSequentially('Make the headline one line on desktop.');
  await api(page, 'POST', `/api/projects/${id}/d/${did}/runs`, {
    prompt: 'Tighten the hero spacing [slow]',
    mode: 'edit',
  });
  await page.getByTestId('comment-run-hint').waitFor({ timeout: 4000 });
  await shot(page, theme, '6-run-active');
  await page.waitForTimeout(4000);
  await page.close();
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'],
  });
  const themes = (process.env.THEMES ?? 'light,dark').split(',') as Theme[];
  for (const theme of themes) await run(theme, browser);
  await browser.close();
}

await main();
