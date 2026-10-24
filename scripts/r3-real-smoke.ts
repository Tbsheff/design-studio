import { spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { Project, RunSentRecord, RunSummary } from '../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4480;
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = process.env.SMOKE_MODEL ?? 'claude-haiku-5-5';
const BUDGET = 0.15;
const QUEUED = 'Also make the main button say "Order now".';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(label: string, fn: () => Promise<T | null>, timeoutMs: number, everyMs = 300): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn().catch(() => null);
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(everyMs);
  }
}

function describe(run: RunSummary): string {
  const kinds = (run.parts ?? []).map((part) => (part.kind === 'tool' ? `tool:${run.toolCalls.find((t) => t.toolUseId === part.toolUseId)?.name ?? '?'}` : part.kind));
  const diffs = run.toolCalls.filter((t) => t.diff).map((t) => `${t.name} +${t.diff?.added} -${t.diff?.removed}`);
  return `status=${run.status} cost=$${run.costUsd.toFixed(4)} parts=[${kinds.join(', ')}] diffs=${JSON.stringify(diffs)} context=${run.contextTokens ?? 0}`;
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio r3 smoke ')));
  const dataDir = path.join(work, 'data');
  const log = createWriteStream(path.join(work, 'server.log'));
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'), STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PORT + 1), STUDIO_VITE_PORT_BASE: '5650' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  const runs: RunSummary[] = [];
  try {
    await waitFor('server', async () => ((await fetch(`${BASE}/`)).ok ? true : null), 60_000, 500);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(BASE);
    const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
    const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
      const res = await fetch(`${BASE}${route}`, { method, headers: { 'x-studio-token': token, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    };
    const list = (pid: string) => call<RunSummary[]>('GET', `/api/projects/${pid}/runs`);
    const finished = (pid: string, runId: string) =>
      waitFor(`run ${runId}`, async () => (await list(pid)).find((run) => run.id === runId && run.status !== 'running') ?? null, 600_000, 1000);

    const { project } = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'A one-section landing page for a small bakery: a headline, one line of copy and one button', kind: 'html', settings: { model: MODEL, maxBudgetUsd: BUDGET } });
    console.log(`[r3-smoke] project ${project.id} model ${project.settings.model}`);
    const first = await waitFor('create run', async () => (await list(project.id)).find((run) => run.status !== 'running') ?? null, 600_000, 1000);
    runs.push(first);
    console.log(`[r3-smoke] create: ${describe(first)}`);

    await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), project.id);
    await page.reload();
    const box = page.locator('.prompt textarea');
    await box.click();
    const runsBefore = await page.locator('[data-run-id]').count();
    await box.fill('Read index.html, then change the headline to "Fresh bread daily". Use the Edit tool.');
    await page.keyboard.press('Meta+Enter');
    await page.locator('[data-run-id]').nth(runsBefore).locator('.tool-row').first().waitFor({ timeout: 120_000 });
    await box.fill(QUEUED);
    await box.press('Enter');
    const runId = await waitFor('edit run id', async () => (await list(project.id)).find((run) => run.request.prompt.startsWith('Read index.html, then change'))?.id ?? null, 30_000);
    const edit = await finished(project.id, runId);
    runs.push(edit);
    const detail = await call<{ sent: RunSentRecord[] }>('GET', `/api/runs/${runId}`);
    const inRun = detail.sent.some((record) => record.text.includes('Order now'));
    console.log(`[r3-smoke] edit: ${describe(edit)} queuedInThisRun=${inRun}`);
    if (!inRun) {
      const next = await waitFor('queued follow-up run', async () => (await list(project.id)).find((run) => run.request.prompt.includes('Order now')) ?? null, 60_000, 500).catch(() => null);
      if (next) {
        const done = await finished(project.id, next.id);
        runs.push(done);
        console.log(`[r3-smoke] queued follow-up run: ${describe(done)}`);
      } else console.log('[r3-smoke] queued message: not found in any run');
    }

    await box.click();
    const before = await page.locator('[data-run-id]').count();
    await box.fill('Read index.html, then add a short opening hours section under the button.');
    await page.keyboard.press('Meta+Enter');
    await page.locator('[data-run-id]').nth(before).locator('.tool-row').first().waitFor({ timeout: 120_000 });
    await box.focus();
    const started = Date.now();
    page.on('request', (request) => {
      if (request.url().includes('/cancel')) console.log(`[r3-smoke] cancel request sent after ${Date.now() - started} ms`);
    });
    page.on('response', (response) => {
      if (response.url().includes('/cancel')) console.log(`[r3-smoke] cancel answered ${response.status()} after ${Date.now() - started} ms`);
    });
    await page.keyboard.press('Escape');
    const stoppedAt = await page.waitForFunction(() => (document.querySelector('[data-run-id]:last-child .run-foot .status.canceled') ? Date.now() : 0), undefined, { polling: 'raf', timeout: 10_000 });
    console.log(`[r3-smoke] Esc to Stopped: ${(await stoppedAt.jsonValue()) - started} ms`);
    const stopped = (await list(project.id)).find((run) => run.request.prompt.startsWith('Read index.html, then add'));
    const nextPrompt = 'Make the button corners round.';
    const nextSent = Date.now();
    await box.fill(nextPrompt);
    await page.keyboard.press('Meta+Enter');
    const next = await waitFor('run after the stop', async () => (await list(project.id)).find((run) => run.request.prompt === nextPrompt) ?? null, 30_000, 100).catch(() => null);
    console.log(`[r3-smoke] send right after the stop: ${next ? `run started after ${Date.now() - nextSent} ms` : 'no run started'}`);
    if (stopped) {
      const done = await finished(project.id, stopped.id);
      runs.push(done);
      console.log(`[r3-smoke] stopped run: ${describe(done)}`);
    }
    if (next) {
      const done = await finished(project.id, next.id);
      runs.push(done);
      console.log(`[r3-smoke] run after the stop: ${describe(done)}`);
    }
    console.log(`[r3-smoke] total cost $${runs.reduce((sum, run) => sum + run.costUsd, 0).toFixed(4)}`);
    console.log(`[r3-smoke] data dir: ${dataDir}`);
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((error: unknown) => {
  console.error('[r3-smoke] failed', error);
  process.exit(1);
});
