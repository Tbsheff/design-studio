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
  if (process.env.VERIFY === '1') await verify(page, id, did);
  else await page.waitForTimeout(4000);
  await page.close();
}

type Row = { id: string; text: string; status: string; mentions?: unknown[]; attachmentIds?: string[]; runId?: string };

async function until<T>(read: () => Promise<T>, ok: (value: T) => boolean, ms = 20000): Promise<T> {
  const end = Date.now() + ms;
  let value = await read();
  while (!ok(value) && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    value = await read();
  }
  return value;
}

async function openCard(page: Page, selector: string): Promise<void> {
  if ((await page.getByTestId('comment-mode-pill').count()) === 0) await page.getByRole('button', { name: /^Comment/ }).first().click();
  await front(page).locator(selector).first().click();
  await page.getByTestId('comment-compose').waitFor();
}

async function verify(page: Page, id: string, did: string): Promise<void> {
  const list = () => api<Row[]>(page, 'GET', `/api/projects/${id}/d/${did}/comments`);
  const runs = async () => (await api<{ id: string; status: string; request: { prompt: string } }[]>(page, 'GET', `/api/projects/${id}/runs`)).map((run) => ({ status: run.status, prompt: run.request.prompt }));
  const idle = async () => until(runs, (rows) => rows.every((run) => run.status !== 'running'), 30000);
  const compose = page.getByTestId('comment-compose');

  await compose.locator('textarea').press('Enter');
  const queued = await until(list, (rows) => rows.some((row) => row.text.startsWith('Make the headline one line')), 5000);
  console.log('queue: right after Enter', queued.find((row) => row.text.startsWith('Make the headline one line'))?.status);
  const settled = await until(list, (rows) => rows.find((row) => row.text.startsWith('Make the headline one line'))?.status === 'resolved', 30000);
  console.log('queue: after the run', settled.find((row) => row.text.startsWith('Make the headline one line'))?.status);
  await idle();

  await openCard(page, 'h1');
  await compose.locator('textarea').fill('');
  await compose.locator('textarea').pressSequentially('Match @index');
  await page.getByTestId('mention-list').waitFor();
  await compose.locator('textarea').press('Enter');
  await compose.locator('textarea').pressSequentially('the hero type to the page scale.');
  await compose.locator('textarea').press('Enter');
  const mentioned = await until(list, (rows) => rows.find((row) => row.text.includes('hero type'))?.status === 'resolved', 30000);
  const withMention = mentioned.find((row) => row.text.includes('hero type'));
  console.log('mentions: stored', JSON.stringify(withMention?.mentions), withMention?.status);
  if (withMention?.runId) {
    const detail = await api<{ sent?: { text: string }[] }>(page, 'GET', `/api/runs/${withMention.runId}`);
    console.log('mentions: in sent text', detail.sent?.some((line) => line.text.includes('index.html')) ?? false);
  }
  await idle();

  await openCard(page, 'p');
  const send = compose.getByRole('checkbox', { name: 'Send to Claude' });
  if (await send.isChecked()) await send.uncheck();
  await compose.evaluate((card) => {
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], 'dot.png', { type: 'image/png' }));
    card.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
  });
  await page.locator('[data-testid="comment-image"]:not(.loading)').waitFor();
  await compose.locator('textarea').pressSequentially('Use this dot as the bullet.');
  await compose.locator('textarea').press('Enter');
  const imaged = await until(list, (rows) => rows.some((row) => row.text.includes('dot as the bullet')), 5000);
  console.log('images: attachmentIds', imaged.find((row) => row.text.includes('dot as the bullet'))?.attachmentIds?.length ?? 0);

  const before = (await list()).length;
  await api(page, 'POST', `/api/projects/${id}/d/${did}/runs`, { prompt: 'Warm up the palette [slow]', mode: 'edit' });
  await openCard(page, 'h1');
  if (!(await send.isChecked())) await send.check();
  await compose.locator('textarea').fill('');
  await compose.locator('textarea').pressSequentially('Steer: keep the headline on one line.');
  await page.getByTestId('comment-run-hint').waitFor({ timeout: 4000 });
  await compose.locator('textarea').press('Meta+Enter');
  const steered = await until(runs, (rows) => rows.some((run) => run.prompt.startsWith('About Page ›')), 30000);
  console.log('steer: next run prompt', steered.find((run) => run.prompt.startsWith('About Page ›'))?.prompt);
  console.log('steer: comments added', (await list()).length - before);
  await idle();
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
