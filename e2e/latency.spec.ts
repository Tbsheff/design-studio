import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { TelemetrySample } from '../src/shared/contracts';
import { BASE_URL, ROOT } from './support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, setSelectMode, type StudioApi } from './support/studio';

const SAMPLES = 20;
const TARGETS = { open: 2000, html: 250, react: 750, select: 100, http: 2000 };
const RESULTS_FILE = path.join(ROOT, 'e2e', 'results', 'latency.json');

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

const PROBE = () => {
  const w = window as unknown as {
    __painted: { token: string; receivedAt: number; sinceNav: number }[];
    __selects: { at: number; drawnAt: number | null }[];
  };
  w.__painted = [];
  w.__selects = [];
  window.addEventListener('message', (event) => {
    const data = event.data as { ns?: string; type?: string; token?: string; at?: number } | null;
    if (!data || data.ns !== 'studio') return;
    if (data.type === 'painted') w.__painted.push({ token: data.token ?? '', receivedAt: Date.now(), sinceNav: performance.now() });
    if (data.type === 'select') w.__selects.push({ at: data.at ?? 0, drawnAt: null });
  });
  const watchOverlay = () => {
    const overlay = document.querySelector('.overlay');
    if (!overlay) {
      requestAnimationFrame(watchOverlay);
      return;
    }
    new MutationObserver(() => {
      const pending = w.__selects.filter((entry) => entry.drawnAt === null);
      if (pending.length === 0 || !document.querySelector('.overlay .box.selected')) return;
      requestAnimationFrame(() => {
        const drawnAt = performance.timeOrigin + performance.now();
        for (const entry of pending) entry.drawnAt = drawnAt;
      });
    }).observe(overlay, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  };
  document.addEventListener('DOMContentLoaded', watchOverlay);
};

async function frontToken(page: Page): Promise<string> {
  const src = (await page.locator('iframe.frame.front').getAttribute('src')) ?? '';
  return new URL(src).searchParams.get('__studio_token') ?? '';
}

async function paintedAfter(page: Page, token: string, after: number): Promise<number> {
  const handle = await page.waitForFunction(
    ([t, a]) => {
      const w = window as unknown as { __painted: { token: string; receivedAt: number }[] };
      return w.__painted.find((entry) => entry.token === t && entry.receivedAt >= (a as number))?.receivedAt ?? null;
    },
    [token, after] as const,
  );
  return (await handle.jsonValue()) as number;
}

async function measureHtml(page: Page, file: string): Promise<number[]> {
  const original = readFileSync(file, 'utf8');
  const out: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const text = `Latency sample ${i}`;
    const next = original.replace(/<h1>[^<]*<\/h1>/, `<h1>${text}</h1>`);
    await page.waitForTimeout(150);
    const t0 = Date.now();
    writeFileSync(file, next);
    await expect(frontFrame(page).locator('h1')).toHaveText(text);
    const token = await frontToken(page);
    out.push((await paintedAfter(page, token, t0)) - t0);
  }
  return out;
}

async function measureReact(page: Page, file: string): Promise<number[]> {
  const original = readFileSync(file, 'utf8');
  const out: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const text = `React sample ${i}`;
    const next = original.replace(/<h1>[^<]*<\/h1>/, `<h1>${text}</h1>`);
    await page.waitForTimeout(150);
    const token = await frontToken(page);
    const t0 = Date.now();
    writeFileSync(file, next);
    await expect(frontFrame(page).locator('h1')).toHaveText(text);
    out.push((await paintedAfter(page, token, t0)) - t0);
    expect(await frontToken(page)).toBe(token);
  }
  return out;
}

async function measureSelect(page: Page): Promise<number[]> {
  await setSelectMode(page, true);
  const targets = ['h1', '.lede', '.cta', '.card h2'];
  for (let i = 0; i < SAMPLES; i += 1) {
    await frontFrame(page).locator(targets[i % targets.length] ?? 'h1').first().click();
    await page.waitForFunction((n) => {
      const w = window as unknown as { __selects: { drawnAt: number | null }[] };
      return w.__selects.length >= n && w.__selects.every((entry) => entry.drawnAt !== null);
    }, i + 1);
    await page.waitForTimeout(60);
  }
  await setSelectMode(page, false);
  const selects = await page.evaluate(() => (window as unknown as { __selects: { at: number; drawnAt: number }[] }).__selects);
  return selects.map((entry) => entry.drawnAt - entry.at);
}

async function measureOpen(page: Page): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    await page.reload();
    const handle = await page.waitForFunction(() => {
      const w = window as unknown as { __painted: { sinceNav: number }[] };
      return w.__painted[0]?.sinceNav ?? null;
    });
    out.push((await handle.jsonValue()) as number);
  }
  return out;
}

async function measureHttp(api: StudioApi): Promise<{ index: number[]; projects: number[] }> {
  const index: number[] = [];
  const projects: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    let t0 = performance.now();
    await (await fetch(`${BASE_URL}/`)).text();
    index.push(performance.now() - t0);
    t0 = performance.now();
    await api.projects();
    projects.push(performance.now() - t0);
  }
  return { index, projects };
}

async function telemetry(api: StudioApi, pid: string): Promise<Record<string, number[]>> {
  const samples = await api.call<TelemetrySample[]>('GET', `/api/telemetry?projectId=${pid}`);
  const out: Record<string, number[]> = {};
  for (const sample of samples) {
    const key = sample.kind === 'preview.latency' ? `preview.latency.${String(sample.detail?.kind ?? '')}` : sample.kind;
    (out[key] ??= []).push(sample.ms);
  }
  return out;
}

test('latency: p95 over 20 samples for html, react, select, open', async ({ page }) => {
  test.setTimeout(600_000);
  await page.addInitScript(PROBE);
  const api = await openHome(page);

  const html = await createProjectViaUi(page, api, 'Latency HTML page', 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText('Latency HTML page');
  await api.waitForRuns(html.id, 1);
  const htmlSamples = await measureHtml(page, path.join(mainDirection(html).workTree, 'index.html'));
  const selectSamples = await measureSelect(page);
  const openSamples = await measureOpen(page);
  const http = await measureHttp(api);
  const htmlTelemetry = await telemetry(api, html.id);

  await page.getByRole('button', { name: 'Projects' }).click();
  const react = await createProjectViaUi(page, api, 'Latency React page', 'react');
  await expect(frontFrame(page).locator('h1')).toHaveText('Latency React page', { timeout: 60_000 });
  await api.waitForRuns(react.id, 1);
  const reactSamples = await measureReact(page, path.join(mainDirection(react).workTree, 'src', 'App.tsx'));
  const reactTelemetry = await telemetry(api, react.id);

  const results = {
    measuredAt: new Date().toISOString(),
    method: {
      html: 'test writes index.html, then parent receives bridge painted from the new front iframe; ms = receivedAt - write time',
      react: 'test writes src/App.tsx, then parent receives bridge painted (MutationObserver) from the same iframe after HMR; ms = receivedAt - write time',
      select: 'bridge click timestamp to the animation frame after .box.selected is drawn in the parent overlay',
      open: 'reload of the studio page to first bridge painted message, from performance.timeOrigin',
      http: 'warm GET / and GET /api/projects from Node',
    },
    targets: TARGETS,
    html: stats(htmlSamples),
    react: stats(reactSamples),
    select: stats(selectSamples),
    open: stats(openSamples),
    httpIndex: stats(http.index),
    httpProjects: stats(http.projects),
    appTelemetry: Object.fromEntries(
      Object.entries({ ...htmlTelemetry, ...reactTelemetry }).map(([key, values]) => [key, stats(values)]),
    ),
  };
  mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  writeFileSync(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`);
  console.log(
    `[latency] p95 ms: open ${Math.round(results.open.p95)} (<${TARGETS.open}), html ${Math.round(results.html.p95)} (<${TARGETS.html}), react ${Math.round(results.react.p95)} (<${TARGETS.react}), select ${Math.round(results.select.p95)} (<${TARGETS.select}), GET / ${results.httpIndex.p95.toFixed(1)}, GET /api/projects ${results.httpProjects.p95.toFixed(1)}`,
  );

  expect(results.html.n).toBe(SAMPLES);
  expect(results.react.n).toBe(SAMPLES);
  expect(results.select.n).toBe(SAMPLES);
  expect(results.open.n).toBe(SAMPLES);
  expect(results.open.p95).toBeLessThan(TARGETS.open);
  expect(results.html.p95).toBeLessThan(TARGETS.html);
  expect(results.react.p95).toBeLessThan(TARGETS.react);
  expect(results.select.p95).toBeLessThan(TARGETS.select);
  expect(results.httpIndex.p95).toBeLessThan(TARGETS.http);
  expect(results.httpProjects.p95).toBeLessThan(TARGETS.http);
});
