import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { DesignComment, Project, RunSummary } from '../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.COMMENTS_REAL_PORT ?? 7170);
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = process.env.COMMENTS_REAL_MODEL ?? 'claude-haiku-5-5';
const BUDGET = 0.35;

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Northwind Coffee</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: #1d1b19; background: #faf7f2; }
    main { max-width: 880px; margin: 0 auto; padding: 72px 24px; }
    h1 { font-size: 48px; margin: 0 0 12px; }
    .lede { font-size: 18px; color: #5b554e; margin: 0 0 28px; }
    .cta { padding: 12px 22px; border: 0; border-radius: 8px; background: #7a4b2a; color: #fff; font-size: 16px; }
  </style>
</head>
<body>
  <main>
    <h1>Northwind Coffee</h1>
    <p class="lede">We roast beans in small batches.</p>
    <button class="cta" type="button">Learn more</button>
  </main>
</body>
</html>
`;

const COMMENTS = [
  { selector: 'h1', text: 'Change this headline to exactly: Fresh coffee, every morning' },
  { selector: '.cta', text: 'Make this button say exactly: Order now' },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(label: string, fn: () => Promise<T | null>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn().catch(() => null);
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(500);
  }
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio comments real ')));
  const dataDir = path.join(work, 'data');
  const site = path.join(work, 'site');
  mkdirSync(site, { recursive: true });
  writeFileSync(path.join(site, 'index.html'), PAGE);
  const log = createWriteStream(path.join(work, 'server.log'));
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'), STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PORT + 1), STUDIO_VITE_PORT_BASE: '27600' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  console.log(`[comments-real] work dir ${work}`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  try {
    await waitFor('server', async () => ((await fetch(`${BASE}/`)).ok ? true : null), 60_000);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(BASE);
    const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
    const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
      const res = await fetch(`${BASE}${route}`, {
        method,
        headers: { 'x-studio-token': token, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    };

    const { project } = await call<{ project: Project }>('POST', '/api/projects/import', { path: site });
    await call('PATCH', `/api/projects/${project.id}/settings`, { model: MODEL, maxBudgetUsd: BUDGET, defaultLevel: 'prototype' });
    const did = project.directions[0]?.id ?? 'main';
    await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), project.id);
    await page.reload();
    const frame = page.frameLocator('iframe.frame.front');
    await frame.locator('h1').waitFor({ timeout: 60_000 });

    for (const comment of COMMENTS) {
      const toggle = page.getByRole('button', { name: 'Comment', exact: true });
      if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
      await frame.locator(comment.selector).click();
      const input = page.getByTestId('comment-compose').getByRole('textbox');
      await input.fill(comment.text);
      await input.press('Enter');
      await page.getByTestId('comment-compose').waitFor({ state: 'detached' });
    }
    await page.keyboard.press('Escape');
    const queued = await call<DesignComment[]>('GET', `/api/projects/${project.id}/d/${did}/comments`);
    console.log(`[comments-real] queued: ${queued.map((c) => `#${c.n} ${c.status}`).join(', ')}`);
    await page.getByTestId('queued-bar').getByRole('button', { name: /^Send 2 queued$/ }).click();

    const runs = await waitFor(
      'comment run',
      async () => {
        const list = await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`);
        return list.length > 0 && list.every((run) => run.status !== 'running') ? list : null;
      },
      600_000,
    );
    const run = runs[runs.length - 1] as RunSummary;
    const settled = await waitFor(
      'settled comments',
      async () => {
        const list = await call<DesignComment[]>('GET', `/api/projects/${project.id}/d/${did}/comments`);
        return list.every((c) => c.status !== 'sent') ? list : null;
      },
      30_000,
    );
    const html = readFileSync(path.join(site, 'index.html'), 'utf8');
    const result = {
      runs: runs.length,
      status: run.status,
      model: run.model,
      costUsd: run.costUsd,
      criticCostUsd: run.criticCostUsd ?? 0,
      durationMs: run.durationMs,
      finalText: run.finalText,
      comments: settled.map((c) => ({ n: c.n, status: c.status, versionId: c.versionId ?? null, runId: c.runId ?? null })),
      headlineDone: html.includes('Fresh coffee, every morning'),
      buttonDone: /<button[^>]*>\s*Order now\s*<\/button>/.test(html),
      ledeKept: html.includes('We roast beans in small batches.'),
    };
    writeFileSync(path.join(work, 'result.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: path.join(work, 'after.png') });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
