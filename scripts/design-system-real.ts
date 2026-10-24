import { spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DesignSystemDraftInfo, DesignSystemDraftResult, RunSummary } from '../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4480;
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = process.env.SMOKE_MODEL ?? 'claude-haiku-5-5';
const BUDGET = Number(process.env.SMOKE_BUDGET ?? 0.45);
const FIXTURE = path.join(ROOT, 'src', 'server', 'design-system', 'extract', '__fixtures__', 'dtcg.tokens.json');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(label: string, fn: () => Promise<T | null>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn().catch(() => null);
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(1000);
  }
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio ds real ')));
  const dataDir = path.join(work, 'data');
  const log = createWriteStream(path.join(work, 'server.log'));
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], {
    cwd: ROOT,
    env: { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'), STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PORT + 1), STUDIO_VITE_PORT_BASE: '5700' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  try {
    const html = await waitFor('server', async () => {
      const res = await fetch(`${BASE}/`);
      return res.ok ? res.text() : null;
    }, 60_000);
    const token = /name="studio-token" content="([^"]+)"/.exec(html)?.[1] ?? '';
    const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
      const res = await fetch(`${BASE}${route}`, { method, headers: { 'x-studio-token': token, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    };
    const draft = await call<DesignSystemDraftResult>('POST', '/api/design-systems/draft', { name: 'Smoke Kit', tokensFile: { name: 'dtcg.tokens.json', text: readFileSync(FIXTURE, 'utf8') } });
    const pid = draft.project.id;
    await call('PATCH', `/api/projects/${pid}/settings`, { model: MODEL, maxBudgetUsd: BUDGET });
    const before = await call<DesignSystemDraftInfo>('GET', `/api/projects/${pid}/design-system-draft`);
    console.log(`[ds-smoke] draft ${draft.pack.id} coverage ${before.coverage?.score} check ${before.check.passed ? 'passed' : `${before.check.problems.length} problems`} model ${MODEL} limit $${BUDGET}`);
    await call('POST', `/api/projects/${pid}/d/main/runs`, { prompt: 'Improve this design system.', mode: 'edit', task: 'design-system', level: 'prototype' });
    const runs = await waitFor('the run', async () => {
      const list = await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`);
      return list.length > 0 && list.every((run) => run.status !== 'running') ? list : null;
    }, 1_200_000);
    const run = runs[0] as RunSummary;
    const after = await call<DesignSystemDraftInfo>('GET', `/api/projects/${pid}/design-system-draft`);
    const tools = run.toolCalls.map((tool) => tool.name.replace('mcp__studio__', ''));
    console.log(`[ds-smoke] status=${run.status} cost=$${run.costUsd.toFixed(4)} durationMs=${run.durationMs} error=${run.error}`);
    console.log(`[ds-smoke] check=${JSON.stringify(run.designSystemCheck)}`);
    console.log(`[ds-smoke] tools=${JSON.stringify(tools)}`);
    console.log(`[ds-smoke] coverage ${before.coverage?.score} -> ${after.coverage?.score}; live check ${after.check.passed ? 'passed' : JSON.stringify(after.check.problems)}`);
    console.log(`[ds-smoke] final text: ${run.finalText.slice(0, 1200)}`);
    console.log(`[ds-smoke] work dir: ${work}`);
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error: unknown) => {
  console.error('[ds-smoke] failed', error);
  process.exit(1);
});
