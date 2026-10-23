import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { Project, RunSummary, Version } from '../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4470;
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = process.env.SMOKE_MODEL ?? 'claude-haiku-5-5';
const BUDGET = 0.5;
const CREATE_PROMPT = 'A landing page for a neighborhood bakery';
const EDIT_PROMPT = 'make this headline shorter';

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
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio real smoke ')));
  const dataDir = path.join(work, 'data');
  const log = createWriteStream(path.join(work, 'server.log'));
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'), STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PORT + 1), STUDIO_VITE_PORT_BASE: '5600' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
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
    const finished = async (pid: string, count: number): Promise<RunSummary[]> =>
      waitFor(`${count} finished runs`, async () => {
        const runs = await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`);
        return runs.filter((run) => run.status !== 'running').length >= count ? runs : null;
      }, 600_000);

    const { project } = await call<{ project: Project }>('POST', '/api/projects', {
      prompt: CREATE_PROMPT,
      kind: 'html',
      settings: { model: MODEL, maxBudgetUsd: BUDGET },
    });
    console.log(`[smoke] project ${project.id} model ${project.settings.model} budget ${project.settings.maxBudgetUsd}`);
    await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), project.id);
    await page.reload();
    await finished(project.id, 1);
    const frame = page.frameLocator('iframe.frame.front');
    await frame.locator('h1').first().waitFor({ timeout: 60_000 });
    const h1Before = (await frame.locator('h1').first().textContent())?.trim();
    console.log(`[smoke] h1 before: ${h1Before}`);

    await page.getByRole('button', { name: /^Select/ }).click();
    await frame.locator('h1').first().click();
    await page.locator('.overlay .box.selected').waitFor();
    await page.getByPlaceholder('Describe a change').fill(EDIT_PROMPT);
    await page.getByRole('button', { name: 'Send' }).click();
    const runs = await finished(project.id, 2);
    await sleep(1500);
    const h1After = (await frame.locator('h1').first().textContent())?.trim();
    console.log(`[smoke] h1 after: ${h1After}`);

    for (const run of [...runs].sort((a, b) => a.startedAt - b.startedAt)) {
      const writes = run.toolCalls
        .filter((tool) => ['Write', 'Edit', 'MultiEdit'].includes(tool.name))
        .map((tool) => `${tool.name}:${path.relative(project.directions[0]?.workTree ?? '', String((tool.input as { file_path?: unknown }).file_path ?? ''))}`);
      console.log(
        `[smoke] run "${run.request.prompt}" status=${run.status} cost=$${run.costUsd.toFixed(4)} turns-tools=${run.toolCalls.length} durationMs=${run.durationMs} writes=${JSON.stringify(writes)} selection=${run.request.selection?.length ?? 0} error=${run.error}`,
      );
    }
    const versions = await call<Version[]>('GET', `/api/projects/${project.id}/d/main/versions`);
    console.log(`[smoke] versions: ${versions.length} ${JSON.stringify(versions.map((v) => [v.id.slice(0, 7), v.meta.kind, v.changedFiles]))}`);
    const total = runs.reduce((sum, run) => sum + run.costUsd, 0);
    console.log(`[smoke] total cost $${total.toFixed(4)}`);
    const [newest, previous] = versions;
    if (newest && previous) {
      const diff = execFileSync('git', ['diff', '--stat', previous.id, newest.id], {
        env: { ...process.env, GIT_DIR: path.join(dataDir, 'projects', project.id, 'git') },
        encoding: 'utf8',
      });
      const full = execFileSync('git', ['diff', '-U0', previous.id, newest.id], {
        env: { ...process.env, GIT_DIR: path.join(dataDir, 'projects', project.id, 'git') },
        encoding: 'utf8',
      });
      console.log(`[smoke] diff stat between edit and create versions:\n${diff}`);
      console.log(`[smoke] diff:\n${full}`);
    }
    console.log(`[smoke] data dir: ${dataDir}`);
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((error: unknown) => {
  console.error('[smoke] failed', error);
  process.exit(1);
});
