import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4970';
const out = path.resolve(process.argv[2] ?? '/tmp/polish-r3');
const prefix = process.argv[3] ?? 'after';
mkdirSync(out, { recursive: true });

async function shot(page: Page, name: string, full = false): Promise<void> {
  await page.waitForTimeout(400);
  const chat = page.locator('aside.panel.right').first();
  if (full || (await chat.count()) === 0) await page.screenshot({ path: path.join(out, `${prefix}-${name}.png`) });
  else await chat.screenshot({ path: path.join(out, `${prefix}-${name}.png`) });
  console.log(`${prefix}-${name}.png`);
}

async function typeAndSend(page: Page, text: string): Promise<void> {
  const box = page.locator('.prompt textarea');
  await box.click();
  await box.fill(text);
  await page.keyboard.press('Meta+Enter');
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(base);
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  await page.evaluate(() => localStorage.clear());
  const created = await page.evaluate(
    async (t) => (await fetch('/api/projects', { method: 'POST', headers: { 'x-studio-token': t, 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'Harbor Lane Coffee [think]', kind: 'html' }) })).json(),
    token,
  );
  const projectId = created.project.id as string;
  await page.goto(base);
  await page.locator(`.project-card[data-project-id="${projectId}"] .project-open`).click();
  await page.locator('.run-foot .status.completed').first().waitFor({ timeout: 20_000 });
  await shot(page, 'chat-finished');
  await shot(page, 'studio-finished', true);

  await typeAndSend(page, 'Harbor Lane Roasters [edit1]');
  await page.locator('.run-foot .status.completed').nth(1).waitFor({ timeout: 20_000 });
  const editRow = page.locator('.tool-row[data-tool="Edit"] .tool-trigger').last();
  if (await editRow.count()) await editRow.click();
  await shot(page, 'chat-diff');

  await typeAndSend(page, '[slow] Add a long event schedule [todo] [steps]');
  await page.locator('.live-status').first().waitFor();
  await page.waitForTimeout(1200);
  await shot(page, 'chat-live');
  const box = page.locator('.prompt textarea');
  if (prefix !== 'before') {
    await box.fill('Use a serif heading');
    await box.press('Enter');
    await box.fill('Then tighten the cards');
    await box.press('Enter');
  }
  await box.fill('Also make the heading larger');
  await shot(page, 'composer-running');
  await shot(page, 'studio-running', true);
  await box.fill('');
  if (prefix === 'before') await page.keyboard.press('Escape');
  const stop = page.getByRole('button', { name: /^(Cancel|Stop)$/ });
  if (await stop.count()) await stop.first().click().catch(() => undefined);
  await page.waitForTimeout(800);
  await shot(page, 'chat-stopped');

  if (prefix !== 'before') {
    const discardFirst = page.locator('.banner').getByRole('button', { name: 'Discard' });
    if (await discardFirst.count()) await discardFirst.click();
    await box.fill('');
    await typeAndSend(page, 'Run the tests [bash]');
    await page.getByTestId('permission-prompt').waitFor();
    await shot(page, 'chat-permission');
    await page.getByTestId('permission-prompt').getByRole('button', { name: 'Deny…' }).click();
    await page.getByLabel('Note for the agent').fill('use npm run check');
    await shot(page, 'chat-permission-deny');
    await page.getByTestId('permission-prompt').getByRole('button', { name: 'Deny', exact: true }).click();
    await page.locator('.run-foot .status:not(.running)').last().waitFor();
    await page.getByTestId('run-settings').click();
    await page.getByTestId('run-settings-popover').getByRole('radio', { name: 'Plan' }).click();
    await shot(page, 'composer-settings');
    await page.keyboard.press('Escape');
    await typeAndSend(page, 'A warmer hero');
    await page.getByTestId('plan-card').waitFor();
    await shot(page, 'chat-plan');
    await page.getByTestId('run-settings').click();
    await page.getByTestId('run-settings-popover').getByRole('radio', { name: 'Edit' }).click();
    await page.keyboard.press('Escape');
    await box.click();
    await box.pressSequentially('Use @ind');
    await page.getByTestId('mention-list').waitFor();
    await shot(page, 'composer-mention');
    await box.press('Enter');
    await shot(page, 'composer-chip');
    await box.fill('');
    await page.keyboard.press('Escape');
    await typeAndSend(page, 'Write the notes [long]');
    await page.locator('.assistant-text[data-streaming] pre').first().waitFor();
    await page.waitForTimeout(600);
    await shot(page, 'chat-streaming');
    await page.locator('.run-foot .status:not(.running)').last().waitFor({ timeout: 20_000 });
  }

  const discard = page.locator('.banner').getByRole('button', { name: 'Discard' });
  if (await discard.count()) await discard.click();
  await typeAndSend(page, '[fail] Add an opening hours table');
  await page.locator('.run-error').first().waitFor({ timeout: 20_000 });
  await shot(page, 'chat-error');
  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
