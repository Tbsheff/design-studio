import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Frame, type Page } from 'playwright-core';
import type { Project, RunSummary, Version } from '../../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4480;
const PREVIEW_PORT = 4481;
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = 'claude-haiku-5-5';
const BUDGET = 0.5;
const CREATE_PROMPT = 'A landing page for a neighborhood bakery with a hero and three product cards. Each card has a short title and one sentence.';
const SELECT_PROMPT = 'Make this title red.';
const FOLLOW_PROMPT = 'Change the text of the main call-to-action button to "Order now".';
const OUT = path.join(ROOT, 'verification', 'ac-edit-evidence');

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

async function previewFrame(page: Page): Promise<Frame> {
  return waitFor('preview frame', async () => page.frames().find((frame) => frame.url().includes(`.localhost:${PREVIEW_PORT}/`)) ?? null, 60_000);
}

interface ElementColor {
  tag: string;
  text: string;
  color: string;
}

async function colorMap(page: Page): Promise<ElementColor[]> {
  const frame = await previewFrame(page);
  return frame.evaluate(() =>
    [...document.body.querySelectorAll('*')]
      .filter((el) => !['SCRIPT', 'STYLE'].includes(el.tagName))
      .map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.textContent ?? '').trim().slice(0, 40), color: getComputedStyle(el).color })),
  );
}

function isRed(color: string): boolean {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return false;
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return r >= 150 && g <= 90 && b <= 90;
}

function toolSummary(run: RunSummary, workTree: string): string[] {
  return run.toolCalls.map((tool) => {
    const file = String((tool.input as { file_path?: unknown }).file_path ?? '');
    return `${tool.name}${file ? `:${path.relative(workTree, file)}` : ''}${tool.isError ? ':error' : ''}`;
  });
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio ac edit real ')));
  const dataDir = path.join(work, 'data');
  const log = createWriteStream(path.join(work, 'server.log'));
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], {
    cwd: ROOT,
    detached: true,
    env: { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PREVIEW_PORT), STUDIO_VITE_PORT_BASE: '7400' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report: Record<string, unknown> = { model: MODEL, dataDir };
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
    const gitDir = (pid: string) => path.join(dataDir, 'projects', pid, 'git');
    const diffBetween = (pid: string, a: string, b: string) =>
      execFileSync('git', ['diff', '-U0', a, b], { env: { ...process.env, GIT_DIR: gitDir(pid) }, encoding: 'utf8' });
    const sortedVersions = async (pid: string) => [...(await call<Version[]>('GET', `/api/projects/${pid}/d/main/versions`))].sort((a, b) => a.createdAt - b.createdAt);

    const { project } = await call<{ project: Project }>('POST', '/api/projects', { prompt: CREATE_PROMPT, kind: 'html', settings: { model: MODEL, maxBudgetUsd: BUDGET } });
    const workTree = project.directions[0]?.workTree ?? '';
    report.projectId = project.id;
    await page.evaluate((pid) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: pid })), project.id);
    await page.reload();
    await finished(project.id, 1);
    await sleep(1500);
    let frame = await previewFrame(page);
    const target = await frame.evaluate(() => {
      const headings = [...document.querySelectorAll('h2, h3, h4')];
      const counts = new Map<string, Element[]>();
      for (const heading of headings) {
        const key = `${heading.tagName}|${heading.parentElement?.className ?? ''}`;
        counts.set(key, [...(counts.get(key) ?? []), heading]);
      }
      const group = [...counts.values()].sort((a, b) => b.length - a.length)[0] ?? headings;
      const chosen = group[0];
      return chosen ? { loc: chosen.getAttribute('data-studio-loc'), text: (chosen.textContent ?? '').trim(), tag: chosen.tagName.toLowerCase(), groupSize: group.length } : null;
    });
    if (!target?.loc) throw new Error('no card title found');
    report.target = target;
    const colorsBefore = await colorMap(page);

    await page.getByRole('button', { name: /^Select/ }).click();
    await page.frameLocator('iframe.frame.front').locator(`[data-studio-loc="${target.loc}"]`).click();
    await page.locator('.overlay .box.selected').waitFor();
    await page.getByRole('button', { name: /^Select/ }).click();
    await page.getByPlaceholder('Describe a change').fill(SELECT_PROMPT);
    await page.getByRole('button', { name: 'Send' }).click();
    await finished(project.id, 2);
    await sleep(2000);
    const colorsAfter = await colorMap(page);
    frame = await previewFrame(page);
    const v1 = await sortedVersions(project.id);
    const [createVersion, selectVersion] = v1;
    const selectDiff = createVersion && selectVersion ? diffBetween(project.id, createVersion.id, selectVersion.id) : '';
    const sameShape = colorsBefore.length === colorsAfter.length && colorsBefore.every((el, index) => el.tag === colorsAfter[index]?.tag);
    const colorChanges = sameShape
      ? colorsBefore.flatMap((el, index) => (el.color !== colorsAfter[index]?.color ? [{ ...el, after: colorsAfter[index]?.color }] : []))
      : null;
    const targetAfter = colorChanges?.filter((change) => change.text === target.text) ?? [];
    report.ac28 = {
      selectDiff,
      changedLineCount: selectDiff.split('\n').filter((line) => /^[+-][^+-]/.test(line)).length,
      sameShape,
      colorChanges,
      targetRed: targetAfter.some((change) => isRed(change.after ?? '')),
      onlyTargetChanged: colorChanges !== null && colorChanges.every((change) => change.text === target.text || change.text.startsWith(target.text)),
    };

    const chip = page.locator('.chip button');
    if (await chip.count()) await chip.first().click();
    await page.getByPlaceholder('Describe a change').fill(FOLLOW_PROMPT);
    await page.getByRole('button', { name: 'Send' }).click();
    const runs = await finished(project.id, 3);
    const v2 = await sortedVersions(project.id);
    const followVersion = v2[v2.length - 1];
    const followDiff = selectVersion && followVersion ? diffBetween(project.id, selectVersion.id, followVersion.id) : '';
    const fileLines = execFileSync('git', ['show', `${followVersion?.id}:index.html`], { env: { ...process.env, GIT_DIR: gitDir(project.id) }, encoding: 'utf8' }).split('\n').length;
    const ordered = [...runs].sort((a, b) => a.startedAt - b.startedAt);
    report.runs = ordered.map((run) => ({
      prompt: run.request.prompt,
      status: run.status,
      costUsd: run.costUsd,
      durationMs: run.durationMs,
      tools: toolSummary(run, workTree),
      selection: run.request.selection?.length ?? 0,
      error: run.error,
      finalText: run.finalText.slice(0, 300),
    }));
    report.ac29 = {
      followDiff,
      followChangedLines: followDiff.split('\n').filter((line) => /^[+-][^+-]/.test(line)).length,
      fileLines,
      followUpWritesOnIndex: ordered.slice(1).map((run) => toolSummary(run, workTree).filter((tool) => /^(Write|Edit|MultiEdit):index\.html/.test(tool))),
    };
    report.totalCostUsd = ordered.reduce((sum, run) => sum + run.costUsd, 0);
    await page.screenshot({ path: path.join(OUT, 'AC-28-29-real.png') });
  } finally {
    writeFileSync(path.join(OUT, 'AC-28-29-real.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    try {
      process.kill(-(server.pid ?? 0), 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
}

main().catch((error: unknown) => {
  console.error('[ac-edit real] failed', error);
  process.exit(1);
});
