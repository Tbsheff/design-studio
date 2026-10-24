import { expect, test, type Page, type Route } from '@playwright/test';
import type { RunSummary, StudioEvent } from '../src/shared/contracts';
import { createProjectViaUi, frontFrame, openHome, type StudioApi } from './support/studio';

const HOLD_MS = 1500;
const composer = (page: Page) => page.locator('.prompt [data-slot="composer-input"]');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function finishedRun(api: StudioApi, pid: string, prompt: string): Promise<RunSummary> {
  let found: RunSummary | undefined;
  await expect.poll(async () => (found = (await api.runs(pid)).find((run) => run.request.prompt === prompt))?.status ?? 'none', { timeout: 30_000 }).not.toMatch(/^(none|running)$/);
  return found as RunSummary;
}

const holds = {
  'before the server starts the run': async (route: Route) => {
    await sleep(HOLD_MS);
    await route.continue();
  },
  'after the server started the run': async (route: Route) => {
    const response = await route.fetch();
    await sleep(HOLD_MS);
    await route.fulfill({ response });
  },
};

for (const [where, hold] of Object.entries(holds)) {
  test(`Chat fix: Esc while the send waits (${where}) stops the run`, async ({ page }) => {
    const api = await openHome(page);
    const name = `Pending Stop ${where.split(' ')[0]}`;
    const project = await createProjectViaUi(page, api, name, 'html');
    await expect(frontFrame(page).locator('h1')).toHaveText(name);
    await api.waitForRuns(project.id, 1);

    let released = 0;
    let held = false;
    await page.route(/\/api\/projects\/[^/]+\/d\/[^/]+\/runs$/, async (route) => {
      if (route.request().method() !== 'POST' || held) return route.fallback();
      held = true;
      await hold(route);
      released = Date.now();
    });

    const prompt = `Walk then stop while sending [steps] ${where}`;
    await composer(page).fill(prompt);
    await composer(page).press('Meta+Enter');
    await sleep(300);
    expect(released).toBe(0);
    const escAt = Date.now();
    await composer(page).press('Escape');

    const run = page.locator('[data-run-id]').last();
    const shownAt = await page.waitForFunction(
      (text) => {
        const runs = Array.from(document.querySelectorAll('[data-run-id]'));
        const last = runs.at(-1);
        return last?.textContent?.includes(text) && last.querySelector('.run-foot .status.canceled') ? Date.now() : 0;
      },
      prompt,
      { polling: 'raf', timeout: 10_000 },
    );
    const stoppedMs = (await shownAt.jsonValue()) - Math.max(escAt, released);
    console.log(`[chat-r4] ${where}: Esc or response, whichever is later -> Stopped shown ${stoppedMs} ms`);
    expect(stoppedMs).toBeLessThan(500);
    await expect(run.locator('.run-foot')).toContainText('Stopped');

    const summary = await finishedRun(api, project.id, prompt);
    expect(summary.status).toBe('canceled');
    await sleep(1200);
    const detail = await api.call<{ events: StudioEvent[] }>('GET', `/api/runs/${summary.id}`);
    expect(detail.events.filter((event) => event.type === 'run.tool.started').length).toBeLessThanOrEqual(1);
    expect(detail.events.some((event) => event.type === 'run.tool.finished' && !event.isError)).toBe(false);
    await expect(run.locator('.tool-row[data-state="done"]')).toHaveCount(0);
    await expect(run.locator('.tool-row[data-state="pending"]')).toHaveCount(0);
  });
}
