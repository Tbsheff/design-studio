import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { RunSentRecord, RunSummary, StudioEvent } from '../src/shared/contracts';
import { createProjectViaUi, frontFrame, mainDirection, openHome, type StudioApi } from './support/studio';

const composer = (page: Page) => page.locator('.prompt [data-slot="composer-input"]');

async function type(page: Page, text: string, key: string): Promise<void> {
  await composer(page).fill(text);
  await composer(page).press(key);
}

async function runFor(api: StudioApi, pid: string, prompt: string): Promise<RunSummary> {
  let found: RunSummary | undefined;
  await expect.poll(async () => (found = (await api.runs(pid)).find((run) => run.request.prompt === prompt))?.id ?? null).not.toBeNull();
  return found as RunSummary;
}

async function finishedRun(api: StudioApi, pid: string, prompt: string): Promise<RunSummary> {
  let found: RunSummary | undefined;
  await expect.poll(async () => (found = (await api.runs(pid)).find((run) => run.request.prompt === prompt))?.status ?? 'none', { timeout: 30_000 }).not.toMatch(/^(none|running)$/);
  return found as RunSummary;
}

async function waitForRunningTool(page: Page): Promise<void> {
  await expect(page.locator('[data-run-id]').last().locator('.tool-row[data-state="pending"]')).toHaveCount(1);
}

async function newProject(page: Page, prompt: string) {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, prompt, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(prompt);
  await api.waitForRuns(project.id, 1);
  return { api, project };
}

test('R3-1, R3-3, R3-4: event order with both thinking blocks, a one-line diff, copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { api, project } = await newProject(page, 'Harbor Lane Coffee');

  await type(page, 'Order probe [think]', 'Meta+Enter');
  await finishedRun(api, project.id, 'Order probe [think]');
  const run = page.locator('[data-run-id]').last();
  const order = await run.locator('.run-body').evaluate((body) =>
    Array.from(body.children).map((child) => {
      if (child.matches('[data-testid="thinking"]')) return `thinking:${child.textContent?.includes('Thought') ? 'done' : 'live'}`;
      if (child.matches('.tools')) return `tool:${child.querySelector('.tool-row')?.getAttribute('data-tool')}`;
      if (child.matches('.assistant-text')) return 'text';
      return null;
    }).filter(Boolean),
  );
  expect(order.slice(0, 4)).toEqual(['thinking:done', 'tool:Read', 'thinking:done', 'text']);
  const second = run.locator('[data-testid="thinking"]').nth(1);
  await second.getByRole('button').click();
  await expect(second.locator('.thinking-text')).toHaveText('Thinking B: keep the cards, then write the change.');
  await page.reload();
  await expect(page.locator('[data-run-id]').last().locator('[data-testid="thinking"]')).toHaveCount(2);

  await type(page, 'Harbor Lane Roasters [edit1]', 'Meta+Enter');
  await finishedRun(api, project.id, 'Harbor Lane Roasters [edit1]');
  const edit = page.locator('[data-run-id]').last().locator('.tool-row[data-tool="Edit"]');
  await expect(edit.locator('.diff-badge')).toHaveText('+1−1');
  await edit.locator('.tool-trigger').click();
  await expect(edit.locator('.diff-line.del .diff-text')).toHaveText(/<h1>Harbor Lane Coffee<\/h1>/);
  await expect(edit.locator('.diff-line.add .diff-text')).toHaveText(/<h1>Harbor Lane Roasters<\/h1>/);
  await expect(page.locator('[data-run-id]').last().getByTestId('run-changes')).toContainText('index.html');

  const last = page.locator('[data-run-id]').last();
  await last.hover();
  await last.getByRole('button', { name: 'Copy reply' }).click();
  const reply = await page.evaluate(() => navigator.clipboard.readText());
  expect(reply).toBe('Changing the heading to "Harbor Lane Roasters".\n\nChanged the heading in `index.html`.');
  await last.locator('.msg.user').hover();
  await last.getByRole('button', { name: 'Copy message' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Harbor Lane Roasters [edit1]');

  await composer(page).fill('');
  await composer(page).press('ArrowUp');
  await expect(composer(page)).toHaveValue('Harbor Lane Roasters [edit1]');
  await composer(page).press('ArrowUp');
  await expect(composer(page)).toHaveValue('Order probe [think]');
  void mainDirection(project);
});

test('R3-2: a message queued during a 3-tool run reaches the agent before tool 3', async ({ page }) => {
  const { api, project } = await newProject(page, 'Queue Probe Bakery');
  await type(page, 'Walk the files [steps]', 'Meta+Enter');
  await waitForRunningTool(page);
  await type(page, 'Use a serif heading', 'Enter');
  await expect(page.getByTestId('queued-item')).toHaveText(/Use a serif heading/);
  const summary = await finishedRun(api, project.id, 'Walk the files [steps]');
  expect(summary.status).toBe('completed');
  const detail = await api.call<{ events: StudioEvent[]; sent: RunSentRecord[] }>('GET', `/api/runs/${summary.id}`);
  const delivered = detail.events.find((event) => event.type === 'run.user');
  const thirdTool = detail.events.filter((event) => event.type === 'run.tool.started')[2];
  expect(delivered && thirdTool && delivered.seq < thirdTool.seq).toBe(true);
  expect(detail.sent.some((record) => record.text.includes('Use a serif heading'))).toBe(true);
  await expect(page.locator('[data-run-id]').last().getByTestId('sent-while-running')).toHaveText(/Use a serif heading/);
  await expect(page.getByTestId('queued-item')).toHaveCount(0);
});

for (const where of ['studio', 'iframe'] as const) {
  test(`R3-2: Esc stops the run in under 500 ms and keeps finished tool rows, focus in ${where}`, async ({ page }) => {
    const { api, project } = await newProject(page, `Esc Probe ${where}`);
    const prompt = `Walk then stop ${where} [steps]`;
    await type(page, prompt, 'Meta+Enter');
    const run = page.locator('[data-run-id]').last();
    await expect(run.locator('.tool-row[data-state="done"]')).toHaveCount(1, { timeout: 10_000 });
    if (where === 'iframe') {
      await frontFrame(page).locator('h1').click();
      await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
      const started = Date.now();
      await frontFrame(page).locator('body').press('Escape');
      const stoppedAt = await page.waitForFunction(() => (document.querySelector('[data-run-id]:last-child .run-foot .status.canceled') ? Date.now() : 0), undefined, { polling: 'raf' });
      expect((await stoppedAt.jsonValue()) - started).toBeLessThan(500);
    } else {
      await composer(page).focus();
      const started = Date.now();
      await page.keyboard.press('Escape');
      const stoppedAt = await page.waitForFunction(() => (document.querySelector('[data-run-id]:last-child .run-foot .status.canceled') ? Date.now() : 0), undefined, { polling: 'raf' });
      expect((await stoppedAt.jsonValue()) - started).toBeLessThan(500);
    }
    await expect(run.locator('.run-foot')).toContainText('Stopped');
    await expect(run.locator('.tool-row[data-state="done"]').first()).toBeVisible();
    expect((await finishedRun(api, project.id, prompt)).status).toBe('canceled');
  });
}

test('R3-2: Cmd+Enter while running sends now (steer) and starts the next run with that text', async ({ page }) => {
  const { api, project } = await newProject(page, 'Steer Probe Studio');
  await type(page, 'Long walk [steps]', 'Meta+Enter');
  await waitForRunningTool(page);
  await type(page, 'Steer: make the heading blue', 'Meta+Enter');
  expect((await finishedRun(api, project.id, 'Long walk [steps]')).status).toBe('canceled');
  expect((await finishedRun(api, project.id, 'Steer: make the heading blue')).status).toBe('completed');
  await expect(page.locator('.msg.user .msg-body').last()).toHaveText('Steer: make the heading blue');
});

test('R3-5: a Bash call asks first; Deny with a note sends the note and runs nothing', async ({ page }) => {
  const { api, project } = await newProject(page, 'Bash Probe Shop');
  await type(page, 'Run the tests [bash]', 'Meta+Enter');
  const prompt = page.getByTestId('permission-prompt');
  await expect(prompt).toContainText('Run this command?');
  await expect(prompt).toContainText('npm test');
  await prompt.getByRole('button', { name: 'Deny…' }).click();
  await prompt.getByLabel('Note for the agent').fill('use npm');
  await prompt.getByRole('button', { name: 'Deny', exact: true }).click();
  const summary = await finishedRun(api, project.id, 'Run the tests [bash]');
  const detail = await api.call<{ sent: RunSentRecord[] }>('GET', `/api/runs/${summary.id}`);
  expect(detail.sent.some((record) => record.text.includes('use npm'))).toBe(true);
  expect(summary.toolCalls.find((tool) => tool.name === 'Bash')?.isError).toBe(true);
  expect(existsSync(path.join(mainDirection(project).workTree, 'mock-bash-output.txt'))).toBe(false);
  await expect(prompt).toHaveCount(0);
});

test('R3-12: a 10k-token reply streams smoothly, an open fence renders as code, and scrolling up is not pulled back', async ({ page }) => {
  const { api, project } = await newProject(page, 'Stream Probe Cafe');
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[]; __probe: boolean };
    w.__frames = [];
    w.__long = [];
    w.__probe = true;
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => w.__long.push(entry.duration))).observe({ type: 'longtask', buffered: false });
    let last = performance.now();
    const tick = (now: number) => {
      if (!w.__probe) return;
      w.__frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await type(page, 'Write long notes [long]', 'Meta+Enter');
  const streaming = page.locator('.assistant-text[data-streaming]');
  await expect(streaming.locator('pre').first()).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => streaming.evaluate((el) => el.textContent?.length ?? 0)).toBeGreaterThan(6000);
  const viewport = page.locator('[data-slot="conversation-content"]');
  await viewport.hover();
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(150);
  const afterWheel = await viewport.evaluate((el) => ({ top: el.scrollTop, gap: el.scrollHeight - el.scrollTop - el.clientHeight }));
  await page.waitForTimeout(600);
  const later = await viewport.evaluate((el) => ({ top: el.scrollTop, gap: el.scrollHeight - el.scrollTop - el.clientHeight }));
  expect(afterWheel.gap).toBeGreaterThan(200);
  expect(Math.abs(later.top - afterWheel.top)).toBeLessThanOrEqual(2);
  expect(later.gap).toBeGreaterThan(afterWheel.gap);
  await finishedRun(api, project.id, 'Write long notes [long]');
  const stats = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[]; __probe: boolean };
    w.__probe = false;
    const frames = w.__frames.slice(2).sort((a, b) => a - b);
    return { count: frames.length, p95: frames[Math.floor(frames.length * 0.95)] ?? 0, max: frames.at(-1) ?? 0, over32: frames.filter((f) => f > 32).length, long: w.__long };
  });
  console.log('[r3] stream frames', JSON.stringify(stats));
  expect(stats.count).toBeGreaterThan(120);
  expect(stats.p95).toBeLessThanOrEqual(17.5);
  expect(stats.over32).toBe(0);
  expect(stats.long.filter((ms) => ms > 50)).toEqual([]);
});
