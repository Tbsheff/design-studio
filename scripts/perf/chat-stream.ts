import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
import type { Project, RunSummary, StudioEvent } from '../../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.PERF_PORT ?? 7570);
const BASE = `http://127.0.0.1:${PORT}`;
const UI_KEY = 'design-studio.ui.v1';
const HISTORY_RUNS = Number(process.env.PERF_HISTORY_RUNS ?? 6);
const HISTORY_WORDS = Number(process.env.PERF_HISTORY_WORDS ?? 400);
const LIVE_WORDS = Number(process.env.PERF_LIVE_WORDS ?? 1200);
const OPEN_REPEATS = Number(process.env.PERF_OPEN_REPEATS ?? 5);
const STREAM_REPEATS = Number(process.env.PERF_STREAM_REPEATS ?? 3);
const SMALL_INTERVAL_MS = 4;
const BIG_CHUNK_WORDS = 12;
const HISTORY_SENTINEL = 'PERFHISTORYEND';

interface Args {
  ui: string;
  label: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return { ui: path.resolve(value('--ui') ?? path.join(ROOT, 'dist', 'ui')), label: value('--label') ?? 'run' };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return Number.NaN;
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

const WORDS = ['layout', 'contrast', 'spacing', 'button', 'header', 'grid', 'token', 'color', 'type', 'scale', 'hero', 'card', 'border', 'shadow', 'motion', 'focus'];

function markdownText(words: number, seed: number, sentinel: string): string {
  const parts: string[] = [];
  let count = 0;
  let block = 0;
  while (count < words) {
    const pick = (i: number) => WORDS[(seed + i * 7 + block * 3) % WORDS.length] ?? 'word';
    if (block % 4 === 1) {
      const items = Array.from({ length: 4 }, (_, i) => `- **${pick(i)}** uses \`${pick(i + 1)}\` and ${pick(i + 2)} ${pick(i + 3)}`);
      parts.push(items.join('\n'));
      count += 24;
    } else if (block % 4 === 3) {
      parts.push(['```css', `.${pick(1)} { color: var(--${pick(2)}); }`, `.${pick(3)} { gap: 8px; }`, '```'].join('\n'));
      count += 10;
    } else {
      const sentence = Array.from({ length: 30 }, (_, i) => pick(i)).join(' ');
      parts.push(`I changed the ${sentence}.`);
      count += 30;
    }
    block += 1;
  }
  parts.push(sentinel);
  return parts.join('\n\n');
}

function chunksOf(text: string, wordsPerChunk: number): string[] {
  const tokens = text.split(/(?<= )/);
  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += wordsPerChunk) chunks.push(tokens.slice(i, i + wordsPerChunk).join(''));
  return chunks;
}

function startServer(dataDir: string, uiDir: string): ChildProcess {
  const child = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['scripts/perf/server.ts'], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      STUDIO_AGENT: 'mock',
      STUDIO_DATA_DIR: dataDir,
      STUDIO_PROJECTS_DIR: `${dataDir} projects`,
      STUDIO_CLAUDE_HOME: path.join(dataDir, 'claude-home'),
      STUDIO_PORT: String(PORT),
      STUDIO_PREVIEW_PORT: String(PORT + 1),
      STUDIO_VITE_PORT_BASE: String(38000),
      PERF_UI_DIR: uiDir,
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  return child;
}

async function waitReady(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const ok = await fetch(`${BASE}/`).then(
      (res) => res.ok,
      () => false,
    );
    if (ok) return;
    await sleep(200);
  }
  throw new Error('perf server did not start');
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    return;
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const down = await fetch(`${BASE}/`).then(
      () => false,
      () => true,
    );
    if (down) return;
    await sleep(100);
  }
  process.kill(-child.pid, 'SIGKILL');
}

async function tokenOf(): Promise<string> {
  const html = await (await fetch(`${BASE}/`)).text();
  const match = /name="studio-token" content="([^"]+)"/.exec(html);
  if (!match?.[1]) throw new Error('studio token meta tag missing');
  return match[1];
}

async function call<T>(token: string, method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { 'x-studio-token': token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function seedProject(token: string): Promise<{ project: Project; template: RunSummary }> {
  const { project } = await call<{ project: Project }>(token, 'POST', '/api/projects', { prompt: 'Perf chat stream', kind: 'html', startRun: false });
  const direction = project.directions[0];
  if (!direction) throw new Error('project has no direction');
  await call(token, 'POST', `/api/projects/${project.id}/d/${direction.id}/runs`, { prompt: 'Perf seed run', mode: 'edit' });
  const deadline = Date.now() + 60_000;
  for (;;) {
    const runs = await call<RunSummary[]>(token, 'GET', `/api/projects/${project.id}/runs`);
    const done = runs.find((run) => run.status !== 'running');
    if (done) return { project, template: done };
    if (Date.now() > deadline) throw new Error('seed run did not finish');
    await sleep(200);
  }
}

function appendHistory(dataDir: string, project: Project, template: RunSummary): void {
  const file = path.join(dataDir, 'projects', project.id, 'events.jsonl');
  const lines = readFileSync(file, 'utf8').trim().split('\n');
  const last = JSON.parse(lines.at(-1) ?? '{}') as StudioEvent;
  let seq = last.seq;
  const directionId = template.directionId;
  const out: string[] = [];
  const now = Date.now() - 60_000;
  for (let run = 0; run < HISTORY_RUNS; run += 1) {
    const runId = `perf_hist_${run}`;
    const sentinel = run === HISTORY_RUNS - 1 ? HISTORY_SENTINEL : `PERFHIST${run}`;
    const text = markdownText(HISTORY_WORDS, run, sentinel);
    const request = { ...template.request, prompt: `History prompt ${run}` };
    const ts = now + run * 1000;
    const push = (body: Record<string, unknown>) => {
      seq += 1;
      out.push(JSON.stringify({ ...body, projectId: project.id, directionId, seq, ts }));
    };
    push({ type: 'run.started', runId, request });
    for (const chunk of chunksOf(text, 1)) push({ type: 'run.text.delta', runId, text: chunk });
    push({ type: 'run.text', runId, text });
    const summary: RunSummary = { ...template, id: runId, request, startedAt: ts, finishedAt: ts + 500, finalText: text, toolCalls: [], versionId: null };
    push({ type: 'run.finished', runId, summary });
  }
  appendFileSync(file, `${out.join('\n')}\n`);
}

const INIT_SCRIPT = `(() => {
  const perf = { commits: 0, longtasks: [], urls: [], sources: [], seq: 100000000 };
  window.__perf = perf;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(), supportsFiber: true, isDisabled: false,
    inject() { return 1; },
    onCommitFiberRoot() { perf.commits += 1; },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, onScheduleFiberRoot() {}, checkDCE() {},
  };
  const Native = window.EventSource;
  class Counted extends Native {
    constructor(url, init) { super(url, init); perf.urls.push(String(url)); perf.sources.push(this); }
  }
  window.EventSource = Counted;
  new PerformanceObserver((list) => { for (const e of list.getEntries()) perf.longtasks.push({ start: e.startTime, duration: e.duration }); }).observe({ type: 'longtask', buffered: true });
  perf.emit = (type, body) => {
    for (const s of perf.sources) if (s.readyState !== 2) s.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(body) }));
  };
  perf.frames = () => {
    const gaps = []; let last = performance.now(); let on = true;
    const tick = (t) => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    return () => { on = false; return gaps; };
  };
  perf.stream = async (opts) => {
    const base = { projectId: opts.projectId, directionId: opts.directionId };
    const ev = (body) => { perf.seq += 1; return { ...body, ...base, seq: perf.seq, ts: Date.now() }; };
    perf.emit('run.started', ev({ type: 'run.started', runId: opts.runId, request: opts.request }));
    for (const text of opts.chunks) {
      perf.emit('run.text.delta', ev({ type: 'run.text.delta', runId: opts.runId, text }));
      await new Promise((r) => setTimeout(r, opts.intervalMs));
    }
    const full = opts.chunks.join('');
    perf.emit('run.text', ev({ type: 'run.text', runId: opts.runId, text: full }));
    perf.emit('run.finished', ev({ type: 'run.finished', runId: opts.runId, summary: { ...opts.summary, id: opts.runId, finalText: full } }));
  };
})();`;

interface OpenSample {
  contentMs: number;
  fcpMs: number;
  commits: number;
  longtaskCount: number;
  longtaskMs: number;
  sseConnections: number;
  sseAfter: string[];
}

interface StreamSample {
  mode: 'small' | 'big';
  deltas: number;
  wallMs: number;
  commits: number;
  longtaskCount: number;
  longtaskMs: number;
  scriptMs: number;
  maxFrameGapMs: number;
  framesOver50ms: number;
  textOk: boolean;
}

async function openProject(browser: Browser, project: Project): Promise<{ page: Page; sample: OpenSample }> {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await context.addInitScript(INIT_SCRIPT);
  await context.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [UI_KEY, JSON.stringify({ activeProjectId: project.id })] as const,
  );
  const page = await context.newPage();
  const sseRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes(`/api/projects/${project.id}/events`)) sseRequests.push(req.url());
  });
  await page.goto(BASE);
  const contentMs = (await page
    .waitForFunction((sentinel) => (document.querySelector('.chat')?.textContent?.includes(sentinel) ? performance.now() : null), HISTORY_SENTINEL, { timeout: 60_000, polling: 'raf' })
    .then((handle) => handle.jsonValue())) as number;
  await sleep(500);
  const stats = await page.evaluate(() => {
    const perf = (window as unknown as { __perf: { commits: number; longtasks: { duration: number }[]; urls: string[] } }).__perf;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
    return { commits: perf.commits, longtasks: perf.longtasks.map((t) => t.duration), urls: perf.urls, fcp };
  });
  const sseAfter = sseRequests.map((url) => new URL(url).searchParams.get('after') ?? '?');
  if (stats.commits === 0) throw new Error('commit counter saw 0 commits; the devtools hook did not attach');
  return {
    page,
    sample: {
      contentMs,
      fcpMs: stats.fcp,
      commits: stats.commits,
      longtaskCount: stats.longtasks.length,
      longtaskMs: stats.longtasks.reduce((a, b) => a + b, 0),
      sseConnections: sseRequests.length,
      sseAfter,
    },
  };
}

async function streamLive(page: Page, project: Project, template: RunSummary, mode: 'small' | 'big', index: number): Promise<StreamSample> {
  const sentinel = `PERFLIVEEND${mode}${index}`;
  const text = markdownText(LIVE_WORDS, 99 + index, sentinel);
  const chunks = mode === 'small' ? chunksOf(text, 1) : chunksOf(text, BIG_CHUNK_WORDS);
  const intervalMs = mode === 'small' ? SMALL_INTERVAL_MS : SMALL_INTERVAL_MS * BIG_CHUNK_WORDS;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const scriptOf = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return (metrics.find((m) => m.name === 'ScriptDuration')?.value ?? 0) * 1000;
  };
  await page.evaluate(() => {
    const perf = (window as unknown as { __perf: { commits: number; longtasks: unknown[]; stopFrames?: () => number[]; frames: () => () => number[] } }).__perf;
    perf.commits = 0;
    perf.longtasks = [];
    perf.stopFrames = perf.frames();
  });
  const scriptBefore = await scriptOf();
  const started = Date.now();
  await page.evaluate(
    (opts) => (window as unknown as { __perf: { stream: (o: unknown) => Promise<void> } }).__perf.stream(opts),
    { projectId: project.id, directionId: template.directionId, runId: `perf_live_${mode}_${index}`, chunks, intervalMs, request: { ...template.request, prompt: `Live ${mode} ${index}` }, summary: { ...template, toolCalls: [], versionId: null } },
  );
  await page.waitForFunction((s) => document.querySelector('.chat')?.textContent?.includes(s) ?? false, sentinel, { timeout: 60_000, polling: 'raf' });
  const wallMs = Date.now() - started;
  await sleep(300);
  const scriptMs = (await scriptOf()) - scriptBefore;
  const stats = await page.evaluate((expected) => {
    const perf = (window as unknown as { __perf: { commits: number; longtasks: { duration: number }[]; stopFrames?: () => number[] } }).__perf;
    const gaps = perf.stopFrames?.() ?? [];
    const bodies = [...document.querySelectorAll('.chat .msg.assistant .msg-body')];
    const last = bodies.at(-1)?.textContent ?? '';
    return { commits: perf.commits, longtasks: perf.longtasks.map((t) => t.duration), gaps, textOk: last.split(expected).length === 2 };
  }, sentinel);
  await cdp.detach();
  return {
    mode,
    deltas: chunks.length,
    wallMs,
    commits: stats.commits,
    longtaskCount: stats.longtasks.length,
    longtaskMs: stats.longtasks.reduce((a, b) => a + b, 0),
    scriptMs,
    maxFrameGapMs: Math.max(0, ...stats.gaps),
    framesOver50ms: stats.gaps.filter((gap) => gap > 50).length,
    textOk: stats.textOk,
  };
}

function summarize(open: OpenSample[], streams: StreamSample[]): Record<string, unknown> {
  const byMode = (mode: 'small' | 'big') => streams.filter((s) => s.mode === mode);
  const streamSummary = (mode: 'small' | 'big') => {
    const list = byMode(mode);
    return {
      deltas: list[0]?.deltas,
      wallMs: median(list.map((s) => s.wallMs)),
      commits: median(list.map((s) => s.commits)),
      longtaskCount: median(list.map((s) => s.longtaskCount)),
      longtaskMs: Math.round(median(list.map((s) => s.longtaskMs))),
      scriptMs: Math.round(median(list.map((s) => s.scriptMs))),
      maxFrameGapMs: Math.round(median(list.map((s) => s.maxFrameGapMs))),
      framesOver50ms: median(list.map((s) => s.framesOver50ms)),
      textOk: list.every((s) => s.textOk),
    };
  };
  return {
    open: {
      sseConnections: median(open.map((s) => s.sseConnections)),
      sseAfter: open[0]?.sseAfter,
      contentMs: Math.round(median(open.map((s) => s.contentMs))),
      fcpMs: Math.round(median(open.map((s) => s.fcpMs))),
      commits: median(open.map((s) => s.commits)),
      longtaskCount: median(open.map((s) => s.longtaskCount)),
      longtaskMs: Math.round(median(open.map((s) => s.longtaskMs))),
    },
    streamSmall: streamSummary('small'),
    streamBig: streamSummary('big'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'studio-perf-'));
  let server = startServer(dataDir, args.ui);
  let browser: Browser | null = null;
  try {
    await waitReady();
    const seeded = await seedProject(await tokenOf());
    await stopServer(server);
    appendHistory(dataDir, seeded.project, seeded.template);
    server = startServer(dataDir, args.ui);
    await waitReady();
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const open: OpenSample[] = [];
    const streams: StreamSample[] = [];
    for (let i = 0; i < OPEN_REPEATS; i += 1) {
      const { page, sample } = await openProject(browser, seeded.project);
      open.push(sample);
      if (i < STREAM_REPEATS * 2) streams.push(await streamLive(page, seeded.project, seeded.template, i % 2 === 0 ? 'small' : 'big', i));
      await page.context().close();
    }
    for (let i = OPEN_REPEATS; i < STREAM_REPEATS * 2; i += 1) {
      const { page } = await openProject(browser, seeded.project);
      streams.push(await streamLive(page, seeded.project, seeded.template, i % 2 === 0 ? 'small' : 'big', i));
      await page.context().close();
    }
    const result = { label: args.label, ui: args.ui, historyRuns: HISTORY_RUNS, liveWords: LIVE_WORDS, summary: summarize(open, streams), open, streams };
    const outDir = path.join(ROOT, 'test-results', 'perf');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, `${args.label}.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ label: args.label, ...result.summary }, null, 2));
  } finally {
    await browser?.close();
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
