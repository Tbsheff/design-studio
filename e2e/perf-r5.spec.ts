import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import type { Project, TelemetrySample } from '../src/shared/contracts';
import { ROOT } from './support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, showVersions, type StudioApi } from './support/studio';

const UI_KEY = 'design-studio.ui.v1';
const RESULTS_FILE = path.join(ROOT, 'e2e', 'results', 'perf-r5.json');
const START_SAMPLES = 12;
const OPEN_SAMPLES = 12;
const VERSION_COUNT = 100;
const GRID_PROJECTS = 54;
const TARGETS = { homeUsableWeb: 800, openFromHome: 1000, versionsPanel: 300, homeJsKb: 300, gridP95: 17.5, gridMax: 32 };

interface Stats {
  n: number;
  p50: number;
  p95: number;
  max: number;
  samples: number[];
}

function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? NaN;
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] ?? NaN, samples: values.map(Math.round) };
}

function saveResult(key: string, value: unknown): void {
  mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let all: Record<string, unknown> = {};
  try {
    all = JSON.parse(readFileSync(RESULTS_FILE, 'utf8')) as Record<string, unknown>;
  } catch {
    all = {};
  }
  all[key] = { ...(value as object), measuredAt: new Date().toISOString(), load: os.loadavg().map((n) => Math.round(n * 10) / 10) };
  writeFileSync(RESULTS_FILE, `${JSON.stringify(all, null, 2)}\n`);
}

function report(name: string, s: Stats, target: number): void {
  console.log(`[perf-r5] ${name}: p50 ${Math.round(s.p50)} p95 ${Math.round(s.p95)} max ${Math.round(s.max)} ms (target < ${target}) load ${os.loadavg()[0]?.toFixed(1)} [${s.samples.join(',')}]`);
}

const HOME_PROBE = () => {
  const w = window as unknown as { __homeUsable: number | null; __painted: { token: string; at: number }[]; __clickAt: number | null; __sources: string[] };
  w.__homeUsable = null;
  w.__painted = [];
  w.__clickAt = null;
  w.__sources = [];
  const Native = window.EventSource;
  window.EventSource = class extends Native {
    constructor(url: string | URL, init?: EventSourceInit) {
      super(url, init);
      w.__sources.push(String(url));
    }
  } as typeof EventSource;
  window.addEventListener('message', (event) => {
    const data = event.data as { ns?: string; type?: string; token?: string } | null;
    if (data?.ns === 'studio' && data.type === 'painted') w.__painted.push({ token: data.token ?? '', at: performance.now() });
  });
  document.addEventListener('pointerdown', (event) => {
    if ((event.target as Element | null)?.closest?.('.project-open')) w.__clickAt = performance.now();
  }, true);
  const check = () => {
    if (w.__homeUsable !== null) return;
    if (document.querySelector('.home [aria-label="Describe the design"]') && document.querySelector('.project-grid .project-card:not(.skeleton)')) {
      requestAnimationFrame(() => {
        w.__homeUsable ??= performance.now();
      });
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
};

async function homeUsable(page: Page): Promise<number> {
  const handle = await page.waitForFunction(() => (window as unknown as { __homeUsable: number | null }).__homeUsable);
  return (await handle.jsonValue()) as number;
}

async function coldHomeStart(browser: Browser): Promise<number> {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  try {
    const page = await context.newPage();
    await page.addInitScript(HOME_PROBE);
    await page.goto('/');
    return await homeUsable(page);
  } finally {
    await context.close();
  }
}

async function telemetry(api: StudioApi, query: string): Promise<TelemetrySample[]> {
  return api.call<TelemetrySample[]>('GET', `/api/telemetry?${query}`);
}

function homeJsBytes(): { entry: string; bytes: number; files: string[] } {
  const dist = path.join(ROOT, 'dist', 'ui');
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<(?:script[^>]*src|link[^>]*rel="modulepreload"[^>]*href)="\/?([^"]+\.js)"/g)].map((match) => match[1] as string);
  const bytes = files.reduce((sum, file) => sum + statSync(path.join(dist, file)).size, 0);
  return { entry: files[0] ?? '', bytes, files };
}

test('R5-1 telemetry: app.start, run.first_token, edit.commit and frame.long after one mock run and one direct edit', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Telemetry probe page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Telemetry probe page');
  await api.waitForRuns(project.id, 1);
  await page.locator('.prompt [data-slot="composer-input"]').fill('Telemetry probe heading');
  await page.locator('.prompt [data-slot="composer-input"]').press('Meta+Enter');
  await api.waitForRuns(project.id, 2);
  const file = path.join(mainDirection(project).workTree, 'index.html');
  await selectInFrame(page, 'h1');
  await page.getByLabel('Font size', { exact: true }).fill('31');
  await page.getByLabel('Font size', { exact: true }).press('Enter');
  await expect.poll(() => readFileSync(file, 'utf8')).toContain('font-size: 31px');
  await page.evaluate(() => {
    const end = performance.now() + 120;
    while (performance.now() < end);
  });
  await page.waitForTimeout(300);
  await page.getByRole('tab', { name: 'Chat' }).click();
  await page.locator('.run-foot-details').last().click();
  await expect(page.getByLabel('Latency breakdown')).toContainText('First token');
  await expect(page.getByLabel('Latency breakdown').locator('div', { hasText: 'First token' }).locator('dd')).toHaveText(/\d.*server \d/);
  await page.getByRole('button', { name: 'Projects' }).click();
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await expect
    .poll(async () => {
      const kinds = new Set([...(await telemetry(api, `projectId=${project.id}`)), ...(await telemetry(api, 'scope=app'))].map((sample) => sample.kind));
      return ['app.start', 'run.first_token', 'edit.commit', 'frame.long'].filter((kind) => !kinds.has(kind as TelemetrySample['kind']));
    })
    .toEqual([]);
  const samples = await telemetry(api, `projectId=${project.id}`);
  const stages = samples.filter((sample) => sample.kind === 'run.first_token').map((sample) => sample.detail?.stage);
  expect(stages).toEqual(expect.arrayContaining(['server', 'visible']));
  expect(samples.find((sample) => sample.kind === 'edit.commit')?.detail).toMatchObject({ kind: 'style', count: 1 });
  expect(samples.find((sample) => sample.kind === 'frame.long')?.ms).toBeGreaterThanOrEqual(100);
});

test('R5 app start: Home usable in web, cold browser context each sample', async ({ browser, page }) => {
  test.setTimeout(240_000);
  const api = await openHome(page);
  if ((await api.projects()).length === 0) await createProjectViaUi(page, api, 'Start probe page', 'html');
  const samples: number[] = [];
  for (let i = 0; i < START_SAMPLES; i += 1) samples.push(await coldHomeStart(browser));
  const s = stats(samples);
  const js = homeJsBytes();
  report('home usable (web, cold)', s, TARGETS.homeUsableWeb);
  console.log(`[perf-r5] home js ${js.bytes} bytes in ${js.files.length} files (target < ${TARGETS.homeJsKb * 1000})`);
  const start = (await telemetry(api, 'scope=app')).filter((sample) => sample.kind === 'app.start');
  saveResult('homeUsableWeb', { ...s, homeJsBytes: js.bytes, homeJsFiles: js.files, appStartSamples: start.length });
  expect(start.length).toBeGreaterThan(0);
  expect(s.p95).toBeLessThan(TARGETS.homeUsableWeb);
  expect(js.bytes).toBeLessThan(TARGETS.homeJsKb * 1000);
});

test('R5 open from Home: card click to first preview paint, fresh page each sample, one EventSource per project', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(HOME_PROBE);
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Open probe page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Open probe page');
  await api.waitForRuns(project.id, 1);
  const samples: number[] = [];
  const sources: string[][] = [];
  for (let i = 0; i < OPEN_SAMPLES; i += 1) {
    await page.evaluate((key) => localStorage.removeItem(key), UI_KEY);
    await page.goto('/');
    await homeUsable(page);
    await page.waitForTimeout(300);
    await page.locator(`.project-card[data-project-id="${project.id}"] .project-open`).click();
    const handle = await page.waitForFunction(() => {
      const w = window as unknown as { __painted: { at: number }[]; __clickAt: number | null };
      const painted = w.__painted.find((entry) => w.__clickAt !== null && entry.at >= w.__clickAt);
      return painted && w.__clickAt !== null ? painted.at - w.__clickAt : null;
    });
    samples.push((await handle.jsonValue()) as number);
    await expect(frontFrame(page).locator('h1')).toHaveText('Open probe page');
    sources.push(await page.evaluate(() => (window as unknown as { __sources: string[] }).__sources));
  }
  const s = stats(samples);
  report('open from Home', s, TARGETS.openFromHome);
  const perProject = sources.map((list) => list.filter((url) => url.includes(`/api/projects/${project.id}/events`)).length);
  saveResult('openFromHome', { ...s, eventSourcesPerOpen: perProject });
  expect(perProject.every((count) => count === 1)).toBe(true);
  expect(s.p95).toBeLessThan(TARGETS.openFromHome);
});

test('R5-5 optimistic Send: message and Starting before the server answers; a failed send puts the draft back', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Optimistic probe page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Optimistic probe page');
  await api.waitForRuns(project.id, 1);
  const composer = page.locator('.prompt [data-slot="composer-input"]');
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/d\/[^/]+\/runs$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await held;
    await route.fallback();
  });
  await composer.fill('Optimistic heading');
  await composer.press('Meta+Enter');
  const pending = page.locator('[data-pending-run]');
  await expect(pending.locator('.msg.user')).toContainText('Optimistic heading');
  await expect(pending.getByTestId('live-status')).toContainText('Starting');
  await expect(composer).toHaveValue('');
  mkdirSync('/tmp/polish-r5', { recursive: true });
  await page.locator('.chat-conversation').screenshot({ path: '/tmp/polish-r5/after-optimistic-send.png' });
  release();
  await api.waitForRuns(project.id, 2);
  await expect(pending).toHaveCount(0);
  await expect(page.locator('.msg.user', { hasText: 'Optimistic heading' })).toHaveCount(1);
  await page.unroute(/\/d\/[^/]+\/runs$/);

  await page.route(/\/d\/[^/]+\/runs$/, (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom', message: 'Server failed' }) }) : route.fallback(),
  );
  await composer.fill('This send fails');
  await composer.press('Meta+Enter');
  await expect(composer).toHaveValue('This send fails');
  await expect(pending).toHaveCount(0);
  await expect(page.locator('.msg.user', { hasText: 'This send fails' })).toHaveCount(0);
  await page.unroute(/\/d\/[^/]+\/runs$/);
  expect((await api.runs(project.id)).length).toBe(2);
});

test('R5 versions panel: 100 versions load and render', async ({ page }) => {
  test.setTimeout(300_000);
  const api = await openHome(page);
  const project: Project = await createProjectViaUi(page, api, 'Versions probe page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Versions probe page');
  await api.waitForRuns(project.id, 1);
  const direction = mainDirection(project);
  const file = path.join(direction.workTree, 'index.html');
  const original = readFileSync(file, 'utf8');
  for (let i = (await api.versions(project.id, direction.id)).length; i < VERSION_COUNT; i += 1) {
    writeFileSync(file, original.replace(/<h1>[^<]*<\/h1>/, `<h1>Version ${i}</h1>`));
    await api.call('POST', `/api/projects/${project.id}/d/${direction.id}/keep`);
  }
  expect((await api.versions(project.id, direction.id)).length).toBeGreaterThanOrEqual(VERSION_COUNT);
  const httpMs: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const t0 = performance.now();
    await api.versions(project.id, direction.id);
    httpMs.push(performance.now() - t0);
  }
  const panelMs: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.reload();
    await expect(page.locator('.topbar')).toBeVisible();
    const t0 = await page.evaluate(() => performance.now());
    await showVersions(page);
    await expect(page.locator('li.version')).toHaveCount(VERSION_COUNT, { timeout: 10_000 });
    const t1 = await page.evaluate(() => performance.now());
    const fetched = await page.evaluate(() => {
      const entry = performance.getEntriesByType('resource').filter((e) => e.name.includes('/versions')).at(-1) as PerformanceResourceTiming | undefined;
      return entry ? entry.responseEnd - entry.startTime : null;
    });
    panelMs.push(Math.max(t1 - t0, fetched ?? 0));
  }
  const h = stats(httpMs);
  const p = stats(panelMs);
  report('GET versions (100)', h, TARGETS.versionsPanel);
  report('versions panel (100)', p, TARGETS.versionsPanel);
  saveResult('versions', { http: h, panel: p });
  expect(h.p95).toBeLessThan(TARGETS.versionsPanel);
  expect(p.p95).toBeLessThan(TARGETS.versionsPanel);
});

test('R5 Home grid scroll is smooth with 50+ cards and thumbnails', async ({ page }) => {
  test.setTimeout(600_000);
  const api = await openHome(page);
  const seeded: string[] = [];
  const have = (await api.projects()).filter((project) => project.thumbnail).length;
  for (let batch = have; batch < GRID_PROJECTS; batch += 6) {
    const created = await Promise.all(
      Array.from({ length: Math.min(6, GRID_PROJECTS - batch) }, (_, k) =>
        api.call<{ project: Project }>('POST', '/api/projects', { prompt: `Grid card ${batch + k} landing page`, kind: 'html' }).then((res) => res.project),
      ),
    );
    seeded.push(...created.map((project) => project.id));
    await Promise.all(created.map((project) => api.waitForRuns(project.id, 1, 120_000)));
  }
  await expect.poll(async () => (await api.projects()).filter((project) => project.thumbnail).length, { timeout: 120_000 }).toBeGreaterThanOrEqual(GRID_PROJECTS);
  await page.goto('/');
  await expect(page.locator('.project-card .project-thumb.has-image')).toHaveCount((await api.projects()).filter((project) => project.thumbnail).length, { timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.mouse.move(800, 600);
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
  const started = Date.now();
  let i = 0;
  while (Date.now() - started < 3000) {
    await page.mouse.wheel(0, i % 60 < 30 ? 90 : -90);
    i += 1;
    await page.waitForTimeout(16);
  }
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __long: number[]; __probe: boolean };
    w.__probe = false;
    const sorted = w.__frames.slice(2).sort((a, b) => a - b);
    return { count: sorted.length, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, max: sorted.at(-1) ?? 0, over16_7: sorted.filter((f) => f > 16.7).length, over32: sorted.filter((f) => f > 32).length, long: w.__long };
  });
  console.log(`[perf-r5] home grid scroll frames ${JSON.stringify(frames)} wheels ${i} cards ${await page.locator('.project-card').count()}`);
  saveResult('homeGridScroll', { ...frames, wheels: i, cards: await page.locator('.project-card').count() });
  for (const id of seeded) await api.call('DELETE', `/api/projects/${id}`).catch(() => undefined);
  expect(frames.count).toBeGreaterThan(120);
  expect(i).toBeGreaterThan(20);
  expect(frames.p95).toBeLessThanOrEqual(TARGETS.gridP95);
  expect(frames.over32).toBe(0);
});
