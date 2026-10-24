import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { TelemetrySample } from '../src/shared/contracts';
import { BASE_URL, ROOT } from './support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, setSelectMode, type StudioApi } from './support/studio';

const SAMPLES = 20;
const SEND_SAMPLES = 12;
const EDIT_SAMPLES = 12;
const TARGETS = { open: 1000, html: 150, react: 400, select: 50, http: 2000, firstToken: 1500, userMessage: 50, edit: 200 };
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
  const send = window as unknown as { __send: { at: number; user: number | null; token: number | null; baseUser: number; baseText: number } | null };
  send.__send = null;
  const filledText = () => [...document.querySelectorAll('.msg.assistant .assistant-text')].filter((el) => (el.textContent ?? '').trim().length > 0).length;
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || !event.metaKey || !(event.target as Element | null)?.closest?.('.prompt')) return;
      send.__send = { at: performance.now(), user: null, token: null, baseUser: document.querySelectorAll('.msg.user').length, baseText: filledText() };
    },
    true,
  );
  new MutationObserver(() => {
    const s = send.__send;
    if (!s) return;
    if (s.user === null && document.querySelectorAll('.msg.user').length > s.baseUser) {
      s.user = -1;
      requestAnimationFrame(() => (s.user = performance.now()));
    }
    if (s.token === null && filledText() > s.baseText) {
      s.token = -1;
      requestAnimationFrame(() => (s.token = performance.now()));
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
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

async function measureSend(page: Page, api: StudioApi, pid: string): Promise<{ user: number[]; token: number[] }> {
  const composer = page.locator('.prompt [data-slot="composer-input"]');
  const before = (await api.runs(pid)).length;
  const user: number[] = [];
  const token: number[] = [];
  for (let i = 0; i < SEND_SAMPLES; i += 1) {
    await composer.fill(`Token sample ${i}`);
    await page.waitForTimeout(150);
    await composer.press('Meta+Enter');
    const handle = await page.waitForFunction(() => {
      const s = (window as unknown as { __send: { at: number; user: number | null; token: number | null } | null }).__send;
      return s && s.user !== null && s.user > 0 && s.token !== null && s.token > 0 ? { user: s.user - s.at, token: s.token - s.at } : null;
    });
    const sample = (await handle.jsonValue()) as { user: number; token: number };
    user.push(sample.user);
    token.push(sample.token);
    await api.waitForRuns(pid, before + i + 1);
    await expect(composer).toBeEnabled();
  }
  return { user, token };
}

async function bytesAt(file: string, ok: (source: string) => boolean): Promise<number> {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (ok(readFileSync(file, 'utf8'))) return Date.now();
    if (Date.now() > deadline) throw new Error(`expected bytes never reached ${file}`);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

async function measureEdit(page: Page, file: string): Promise<number[]> {
  await selectInFrame(page, 'h1');
  const field = page.getByLabel('Font size', { exact: true });
  const out: number[] = [];
  for (let i = 0; i < EDIT_SAMPLES; i += 1) {
    const needle = `font-size: ${40 + i}px`;
    await field.fill(String(40 + i));
    await page.waitForTimeout(100);
    const t0 = Date.now();
    await field.press('Enter');
    out.push((await bytesAt(file, (source) => source.includes(needle))) - t0);
    await expect(page.locator('.ins-status.saving')).toHaveCount(0);
    await expect(page.locator('iframe.frame')).toHaveCount(1);
    await page.waitForTimeout(120);
  }
  await setSelectMode(page, false);
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

test('latency: p95 for html, react, select, open, user message, first token and direct edit', async ({ page }) => {
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
  const send = await measureSend(page, api, html.id);
  const editSamples = await measureEdit(page, path.join(mainDirection(html).workTree, 'index.html'));
  const htmlTelemetry = await telemetry(api, html.id);

  await page.getByRole('button', { name: 'Projects' }).click();
  const react = await createProjectViaUi(page, api, 'Latency React page', 'react');
  await expect(frontFrame(page).locator('h1')).toHaveText('Latency React page', { timeout: 60_000 });
  await api.waitForRuns(react.id, 1);
  const reactSamples = await measureReact(page, path.join(mainDirection(react).workTree, 'src', 'App.tsx'));
  const reactTelemetry = await telemetry(api, react.id);

  const results = {
    measuredAt: new Date().toISOString(),
    load: os.loadavg(),
    method: {
      html: 'test writes index.html, then parent receives bridge painted from the new front iframe; ms = receivedAt - write time',
      react: 'test writes src/App.tsx, then parent receives bridge painted (MutationObserver) from the same iframe after HMR; ms = receivedAt - write time',
      select: 'bridge click timestamp to the animation frame after .box.selected is drawn in the parent overlay',
      open: 'reload of the studio page to first bridge painted message, from performance.timeOrigin',
      http: 'warm GET / and GET /api/projects from Node',
      userMessage: 'Cmd+Enter keydown in the composer to the animation frame after the user message is in the chat (studio page clock)',
      firstToken: 'Cmd+Enter keydown to the animation frame after the first assistant text node has text, mock agent',
      edit: 'Enter in the Font size field to the new bytes on disk (Node clock), direct edit with no model call',
    },
    targets: TARGETS,
    html: stats(htmlSamples),
    react: stats(reactSamples),
    select: stats(selectSamples),
    open: stats(openSamples),
    userMessage: stats(send.user),
    firstToken: stats(send.token),
    edit: stats(editSamples),
    httpIndex: stats(http.index),
    httpProjects: stats(http.projects),
    appTelemetry: Object.fromEntries(
      Object.entries({ ...htmlTelemetry, ...reactTelemetry }).map(([key, values]) => [key, stats(values)]),
    ),
  };
  mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  writeFileSync(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`);
  console.log(
    `[latency] p95 ms: open ${Math.round(results.open.p95)} (<${TARGETS.open}), html ${Math.round(results.html.p95)} (<${TARGETS.html}), react ${Math.round(results.react.p95)} (<${TARGETS.react}), select ${Math.round(results.select.p95)} (<${TARGETS.select}), user message ${Math.round(results.userMessage.p95)} (<${TARGETS.userMessage}), first token ${Math.round(results.firstToken.p95)} (<${TARGETS.firstToken}), edit ${Math.round(results.edit.p95)} (<${TARGETS.edit}), GET / ${results.httpIndex.p95.toFixed(1)}, GET /api/projects ${results.httpProjects.p95.toFixed(1)}; load ${os.loadavg()[0]?.toFixed(1)}`,
  );

  expect(results.html.n).toBe(SAMPLES);
  expect(results.react.n).toBe(SAMPLES);
  expect(results.select.n).toBe(SAMPLES);
  expect(results.open.n).toBe(SAMPLES);
  expect(results.open.p95).toBeLessThan(TARGETS.open);
  expect(results.html.p95).toBeLessThan(TARGETS.html);
  expect(results.react.p95).toBeLessThan(TARGETS.react);
  expect(results.select.p95).toBeLessThan(TARGETS.select);
  expect(results.userMessage.p95).toBeLessThan(TARGETS.userMessage);
  expect(results.firstToken.p95).toBeLessThan(TARGETS.firstToken);
  expect(results.edit.p95).toBeLessThan(TARGETS.edit);
  expect(results.httpIndex.p95).toBeLessThan(TARGETS.http);
  expect(results.httpProjects.p95).toBeLessThan(TARGETS.http);
});
