import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

test('R3-7: todo writes update "N of M" in place, finished messages do not change, and the list stays after reload', async ({ page }) => {
  const { api, project } = await newProject(page, 'Todo Probe Market');
  await type(page, 'Plan the page [todo]', 'Meta+Enter');
  const count = page.getByTestId('todo-count');
  await expect(count).toHaveText('1 of 5');
  await page.evaluate(() => {
    const first = document.querySelector('[data-run-id]');
    const w = window as unknown as { __mutations: number };
    w.__mutations = 0;
    if (first) new MutationObserver((records) => (w.__mutations += records.length)).observe(first, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  const panel = await page.getByTestId('todo-panel').elementHandle();
  await expect(count).toHaveText('2 of 5', { timeout: 10_000 });
  expect(await panel?.evaluate((el) => el.isConnected)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __mutations: number }).__mutations)).toBe(0);
  await expect(page.locator('.todo-item[aria-current="step"]')).toContainText('Plan the layout');
  await finishedRun(api, project.id, 'Plan the page [todo]');
  await page.reload();
  await expect(page.getByTestId('todo-count')).toHaveText('2 of 5');
});

test('R3-9: the context meter shows input tokens over the model window and the effort choice is in the next request', async ({ page }) => {
  const { api, project } = await newProject(page, 'Meter Probe Gallery');
  const meter = page.getByTestId('context-meter');
  await expect(meter).toHaveAttribute('data-tokens', '24000');
  await expect(meter).toHaveAttribute('aria-valuenow', '12');
  await page.getByTestId('run-settings').click();
  await page.getByTestId('run-settings-popover').getByRole('radio', { name: 'High' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('run-settings')).toContainText('High effort');
  await type(page, 'Think hard about the hero', 'Meta+Enter');
  const run = await runFor(api, project.id, 'Think hard about the hero');
  expect(run.request.effort).toBe('high');
});

test('R3-10: the retry line counts down, and Retry on an error card adds no second user message', async ({ page }) => {
  const { api, project } = await newProject(page, 'Retry Probe Diner');
  await type(page, 'Slow start [retry]', 'Meta+Enter');
  await expect(page.getByTestId('live-status')).toContainText(/Retrying in [12]s \(1\/5\)/);
  await finishedRun(api, project.id, 'Slow start [retry]');
  await type(page, '[fail] Break on purpose', 'Meta+Enter');
  await finishedRun(api, project.id, '[fail] Break on purpose');
  const users = page.locator('.msg.user .msg-body');
  const before = await users.count();
  const discard = page.locator('.banner').getByRole('button', { name: 'Discard' });
  if (await discard.count()) await discard.click();
  await page.locator('.run-error').getByRole('button', { name: 'Retry' }).click();
  await expect.poll(async () => (await api.runs(project.id)).filter((run) => run.request.prompt === '[fail] Break on purpose').length).toBe(2);
  await expect(page.getByTestId('retry-marker')).toHaveCount(1);
  expect(await users.count()).toBe(before);
});

test('R3-8: plan mode refuses a write, then Approve starts the build', async ({ page }) => {
  const { api, project } = await newProject(page, 'Plan Probe Florist');
  const before = (await api.versions(project.id, mainDirection(project).id)).length;
  await page.getByTestId('run-settings').click();
  await page.getByTestId('run-settings-popover').getByRole('radio', { name: 'Plan' }).click();
  await page.keyboard.press('Escape');
  await composer(page).fill('A warmer hero');
  await composer(page).press('Meta+Enter');
  const planned = await finishedRun(api, project.id, 'A warmer hero');
  expect(planned.request.plan).toBe(true);
  const write = planned.toolCalls.find((tool) => tool.name === 'Write');
  expect(write?.isError).toBe(true);
  expect((await api.versions(project.id, mainDirection(project).id)).length).toBe(before);
  await page.getByTestId('plan-card').getByRole('button', { name: 'Approve and build' }).click();
  const built = await finishedRun(api, project.id, 'Build the plan above.');
  expect(built.status).toBe('completed');
  expect(built.request.plan).toBeUndefined();
  expect((await api.versions(project.id, mainDirection(project).id)).length).toBe(before + 1);
});

test('R3-6: @ lists files fast, @hdr ranks Header.tsx first, and the chip content is in the sent prompt', async ({ page }) => {
  const { api, project } = await newProject(page, 'Mention Probe Lab');
  const workTree = mainDirection(project).workTree;
  mkdirSync(path.join(workTree, 'src', 'components'), { recursive: true });
  mkdirSync(path.join(workTree, 'src', 'hooks'), { recursive: true });
  writeFileSync(path.join(workTree, 'src', 'components', 'Header.tsx'), 'export const HEADER_MARKER = "mention-probe-123";\n');
  writeFileSync(path.join(workTree, 'src', 'components', 'HeroDisplay.tsx'), 'export {};\n');
  writeFileSync(path.join(workTree, 'src', 'hooks', 'useData.ts'), 'export {};\n');
  await composer(page).focus();
  await page.waitForTimeout(300);
  await composer(page).pressSequentially('Use ');
  const typedAt = Date.now();
  await composer(page).press('@');
  const openAt = await page.waitForFunction(() => (document.querySelector('[data-testid="mention-list"] [role="option"]') ? Date.now() : 0), undefined, { polling: 'raf' });
  const openMs = (await openAt.jsonValue()) - typedAt;
  console.log('[r3] mention list open ms', openMs);
  expect(openMs).toBeLessThan(100);
  await composer(page).pressSequentially('hdr');
  await expect(page.locator('[data-testid="mention-list"] [role="option"]').first()).toContainText('Header.tsx');
  await composer(page).press('Enter');
  await expect(page.getByTestId('mention-chip')).toHaveText('Header.tsx');
  await expect(composer(page)).toHaveValue('Use ');
  await composer(page).pressSequentially('for the nav');
  await composer(page).press('Meta+Enter');
  const run = await finishedRun(api, project.id, 'Use for the nav');
  expect(run.request.mentions).toEqual([{ kind: 'file', path: 'src/components/Header.tsx' }]);
  const detail = await api.call<{ sent: RunSentRecord[] }>('GET', `/api/runs/${run.id}`);
  expect(detail.sent[0]?.text).toContain('mention-probe-123');
  await expect(page.getByTestId('mention-chip')).toHaveCount(0);
});
