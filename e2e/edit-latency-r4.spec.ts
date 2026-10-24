import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ROOT } from './support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, selectInFrame, type StudioApi } from './support/studio';

const SAMPLES = 7;
const TARGET_MS = 200;
const RESULTS_FILE = path.join(ROOT, 'e2e', 'results', 'edit-latency-r4.json');

const PAGE = `<!doctype html>
<html>
<head><style>
body { margin: 0; font: 16px system-ui; }
main { padding: 40px; }
h1 { font-size: 32px; margin: 0 0 16px; }
.cards { display: flex; flex-direction: row; gap: 16px; padding: 16px; background: #f3f4f6; }
.card { width: 200px; padding: 16px; background: #e5e7eb; }
</style></head>
<body>
  <main>
    <h1>Latency Page</h1>
    <h2>Section title</h2>
    <section class="cards" aria-label="Highlights">
      <article class="card" id="c1">Card one</article>
      <article class="card" id="c2">Card two</article>
      <article class="card" id="c3">Card three</article>
    </section>
  </main>
</body>
</html>
`;

interface Stats {
  n: number;
  median: number;
  p95: number;
  max: number;
  samples: number[];
}

interface Ctx {
  api: StudioApi;
  file: string;
  pid: string;
  did: string;
}

const results: Record<string, Stats> = {};
const RUN_ID = String(process.ppid);

function saveResults(name: string, value: Stats): void {
  mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  let saved: { runId?: string; results?: Record<string, Stats> } = {};
  try {
    saved = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    saved = {};
  }
  const kept = saved.runId === RUN_ID ? (saved.results ?? {}) : {};
  const method = {
    clocks:
      'visible = rAF poll inside the preview frame (performance.timeOrigin + now) minus the trigger event stamp in the studio page (performance.timeOrigin + event.timeStamp); two documents, one browser clock. bytes = Node Date.now() poll of the file every 2 ms minus Node Date.now() just before Playwright sends the input; one Node clock, includes Playwright dispatch.',
    fontVisible: 'the number field previews on every input event, so visible is input event -> computed font-size in the frame (already true before Enter); bytes is Enter -> file',
    flex: 'click Vertical: pointerdown -> computed flex-direction column in the frame; click -> file',
    text: 'dblclick event -> first frame with an active contenteditable caret (in frame); Cmd+Enter -> file',
    resize: 'pointermove -> computed width in the frame; pointerup -> file',
    rename: 'Enter keydown -> layers row shows the new name (studio page rAF); Enter -> file',
    move: 'Alt+Arrow keydown -> the new preview frame is front (no live preview for moves; studio page rAF), then the order is checked in the frame; key -> file',
    undo: 'Cmd+Z keydown -> the new preview frame is front (studio page rAF), then font-size is checked in the frame; key -> file',
    samples: `${SAMPLES} measured samples per type after one discarded warm-up edit; p95 of 7 samples is the max`,
  };
  const body = { runId: RUN_ID, measuredAt: new Date().toISOString(), targetMs: TARGET_MS, method, results: { ...kept, [name]: value } };
  writeFileSync(RESULTS_FILE, `${JSON.stringify(body, null, 2)}\n`);
}

function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? NaN;
  return { n: sorted.length, median: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? NaN, samples: values.map((v) => Math.round(v)) };
}

function record(name: string, values: number[]): Stats {
  const s = stats(values);
  results[name] = s;
  saveResults(name, s);
  console.log(`[edit-latency-r4] ${name}: median ${Math.round(s.median)} p95 ${Math.round(s.p95)} max ${Math.round(s.max)} ms ${JSON.stringify(s.samples)}`);
  return s;
}

function armStamps(): void {
  const w = window as unknown as { __stamp: Record<string, number>; __seen: Record<number, number>; __caretMs?: number };
  w.__stamp = {};
  w.__seen = {};
  window.addEventListener('message', (event) => {
    const data = event.data as { latencySeen?: number; latencyId?: number } | null;
    if (typeof data?.latencySeen === 'number' && typeof data.latencyId === 'number') w.__seen[data.latencyId] = data.latencySeen;
  });
  const keep = (event: Event) => {
    const key = event.type === 'keydown' ? `key:${(event as KeyboardEvent).key}` : event.type;
    w.__stamp[key] = performance.timeOrigin + event.timeStamp;
  };
  for (const type of ['keydown', 'pointerdown', 'pointermove', 'pointerup', 'input', 'dblclick']) window.addEventListener(type, keep, true);
  window.addEventListener(
    'dblclick',
    (event) => {
      const from = event.timeStamp;
      w.__caretMs = undefined;
      const tick = (now: number) => {
        const selection = window.getSelection();
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.isContentEditable && selection && selection.rangeCount > 0) w.__caretMs = now - from;
        else if (now - from < 2000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    true,
  );
}

async function stampOf(page: Page, key: string): Promise<number> {
  return page.evaluate((k) => (window as unknown as { __stamp: Record<string, number> }).__stamp[k] ?? NaN, key);
}

async function clearStamps(page: Page): Promise<void> {
  await page.evaluate(() => ((window as unknown as { __stamp: Record<string, number> }).__stamp = {}));
}

async function bytesAt(file: string, ok: (source: string) => boolean): Promise<number> {
  const deadline = Date.now() + 5000;
  for (;;) {
    if (ok(readFileSync(file, 'utf8'))) return Date.now();
    if (Date.now() > deadline) throw new Error(`expected bytes never reached ${file}`);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

type Probe = { kind: 'style'; prop: string; want: string } | { kind: 'index'; want: number } | { kind: 'text'; want: string };

let watchId = 0;

async function watch(target: Locator, probe: Probe): Promise<() => Promise<number>> {
  const page = target.page();
  watchId += 1;
  const id = watchId;
  await target.evaluate(
    (node, [p, key]) => {
      const el = node as HTMLElement;
      const done = (): boolean => {
        if (p.kind === 'style') return getComputedStyle(el).getPropertyValue(p.prop) === p.want;
        if (p.kind === 'index') return [...(el.parentElement?.children ?? [])].indexOf(el) === p.want;
        return (el.textContent ?? '').includes(p.want);
      };
      const report = (at: number) => window.top?.postMessage({ latencySeen: at, latencyId: key }, '*');
      const check = () => (done() ? report(performance.timeOrigin + performance.now()) : requestAnimationFrame(check));
      check();
    },
    [probe, id] as const,
  );
  return async () => {
    const seen = await page.waitForFunction((key) => (window as unknown as { __seen: Record<number, number> }).__seen[key] ?? null, id, { timeout: 5000 });
    return (await seen.jsonValue()) as number;
  };
}

async function watchSwap(page: Page): Promise<() => Promise<number>> {
  watchId += 1;
  const id = watchId;
  await page.evaluate((key) => {
    const w = window as unknown as { __seen: Record<number, number> };
    const front = () => document.querySelector('iframe.frame.front')?.getAttribute('src') ?? '';
    const from = front();
    const check = () => {
      if (front() !== from && !document.querySelector('iframe.frame.back')) w.__seen[key] = performance.timeOrigin + performance.now();
      else requestAnimationFrame(check);
    };
    check();
  }, id);
  return async () => {
    const seen = await page.waitForFunction((key) => (window as unknown as { __seen: Record<number, number> }).__seen[key] ?? null, id, { timeout: 5000 });
    return (await seen.jsonValue()) as number;
  };
}

async function settled(page: Page, ctx: Ctx): Promise<void> {
  await expect(page.locator('.ins-status.saving')).toHaveCount(0);
  await expect(page.locator('iframe.frame.back')).toHaveCount(0);
  await expect(page.locator('iframe.frame')).toHaveCount(1);
  const versions = await ctx.api.versions(ctx.pid, ctx.did);
  await expect.poll(async () => (await ctx.api.project(ctx.pid)).directions.find((d) => d.id === ctx.did)?.headVersionId ?? null).toBe(versions[0]?.id ?? null);
  await page.waitForTimeout(120);
}

async function keepFixture(page: Page): Promise<void> {
  const banner = page.locator('.banner', { hasText: 'Unfinished changes' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Keep', exact: true }).click();
  await expect(banner).toHaveCount(0);
}

async function htmlProject(page: Page, title: string): Promise<Ctx> {
  await page.addInitScript(armStamps);
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, title, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(title);
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  const file = path.join(main.workTree, 'index.html');
  writeFileSync(file, PAGE);
  await expect(frontFrame(page).locator('#c1')).toHaveText('Card one');
  await keepFixture(page);
  await expect(page.locator('iframe.frame.back')).toHaveCount(0);
  return { api, file, pid: project.id, did: main.id };
}

async function focusStudio(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
}

async function focusCanvas(page: Page): Promise<void> {
  await page.locator('.canvas .stage').click({ position: { x: 8, y: 8 } });
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName ?? null)).not.toBe('IFRAME');
}

async function fontSample(page: Page, ctx: Ctx, size: number): Promise<{ visible: number; bytes: number }> {
  const field = page.getByLabel('Font size', { exact: true });
  const needle = `font-size: ${size}px`;
  expect(readFileSync(ctx.file, 'utf8')).not.toContain(needle);
  const seen = await watch(frontFrame(page).locator('h1'), { kind: 'style', prop: 'font-size', want: `${size}px` });
  await clearStamps(page);
  await field.fill(String(size));
  const visible = (await seen()) - (await stampOf(page, 'input'));
  const t0 = Date.now();
  await field.press('Enter');
  const bytes = (await bytesAt(ctx.file, (s) => s.includes(needle))) - t0;
  await settled(page, ctx);
  return { visible, bytes };
}

test('edit latency R4: number field font size', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Font Size');
  await selectInFrame(page, 'h1');
  await fontSample(page, ctx, 29);
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const sample = await fontSample(page, ctx, 33 + i);
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('font-size visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  expect(record('font-size bytes', bytes).p95).toBeLessThanOrEqual(TARGET_MS);
});

async function flexSample(page: Page, ctx: Ctx): Promise<{ visible: number; bytes: number }> {
  const layout = page.getByRole('region', { name: 'Auto layout' });
  await layout.getByRole('button', { name: 'Horizontal' }).click();
  await expect.poll(() => readFileSync(ctx.file, 'utf8')).not.toContain('flex-direction: column');
  await settled(page, ctx);
  const seen = await watch(frontFrame(page).locator('.cards'), { kind: 'style', prop: 'flex-direction', want: 'column' });
  await clearStamps(page);
  const t0 = Date.now();
  await layout.getByRole('button', { name: 'Vertical' }).click();
  const bytes = (await bytesAt(ctx.file, (s) => s.includes('flex-direction: column'))) - t0;
  const visible = (await seen()) - (await stampOf(page, 'pointerdown'));
  await settled(page, ctx);
  return { visible, bytes };
}

async function selectCards(page: Page): Promise<void> {
  await selectInFrame(page, '#c1');
  await focusStudio(page);
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.ins-tag')).toHaveText('section');
}

test('edit latency R4: flex direction row to column', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Flex Direction');
  await selectCards(page);
  await expect(page.getByRole('region', { name: 'Auto layout' }).getByRole('group', { name: 'Direction' })).toBeVisible();
  await flexSample(page, ctx);
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const sample = await flexSample(page, ctx);
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('flex-direction visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  expect(record('flex-direction bytes', bytes).p95).toBeLessThanOrEqual(TARGET_MS);
});

async function caretMs(page: Page): Promise<number> {
  const h1 = frontFrame(page).locator('h1');
  await expect.poll(() => h1.evaluate(() => (window as unknown as { __caretMs?: number }).__caretMs ?? null)).not.toBeNull();
  return h1.evaluate(() => (window as unknown as { __caretMs: number }).__caretMs);
}

async function textSample(page: Page, ctx: Ctx, text: string, needle: string): Promise<{ caret: number; bytes: number }> {
  expect(readFileSync(ctx.file, 'utf8')).not.toContain(needle);
  const h1 = frontFrame(page).locator('h1');
  await h1.evaluate(() => ((window as unknown as { __caretMs?: number }).__caretMs = undefined));
  await h1.dblclick();
  const caret = await caretMs(page);
  await page.keyboard.press('Meta+A');
  await page.keyboard.type(text);
  const t0 = Date.now();
  await page.keyboard.press('Meta+Enter');
  const bytes = (await bytesAt(ctx.file, (s) => s.includes(needle))) - t0;
  await expect(page.getByLabel('Text content')).toHaveValue(text);
  await settled(page, ctx);
  await expect(h1).toHaveText(text);
  await expect(h1).not.toHaveAttribute('contenteditable');
  return { caret, bytes };
}

async function textRuns(page: Page, ctx: Ctx, label: string): Promise<void> {
  await selectInFrame(page, 'h1');
  await textSample(page, ctx, `${label} warm`, `<h1>${label} warm</h1>`);
  const caret: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const text = `${label} ${i}`;
    const sample = await textSample(page, ctx, text, `<h1>${text}</h1>`);
    caret.push(sample.caret);
    bytes.push(sample.bytes);
  }
  const key = label.toLowerCase().replace(/\s+/g, '-');
  expect(record(`${key} dblclick-caret visible`, caret).p95).toBeLessThanOrEqual(TARGET_MS);
  expect(record(`${key} cmd-enter bytes`, bytes).p95).toBeLessThanOrEqual(TARGET_MS);
}

test('edit latency R4: inline text edit on canvas, HTML', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Inline Html');
  await textRuns(page, ctx, 'Text html');
});

test('edit latency R4: inline text edit on canvas, React', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(armStamps);
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Latency Inline React', 'react');
  await expect(frontFrame(page).locator('h1')).toHaveText('Latency Inline React', { timeout: 90_000 });
  await api.waitForRuns(project.id, 1);
  const main = mainDirection(project);
  const ctx: Ctx = { api, file: path.join(main.workTree, 'src', 'App.tsx'), pid: project.id, did: main.id };
  await textRuns(page, ctx, 'Text react');
});

async function resizeSample(page: Page, ctx: Ctx, delta: number): Promise<{ visible: number; bytes: number }> {
  const handle = page.locator('.resize-handle.e');
  const card = frontFrame(page).locator('#c1');
  const start = await card.evaluate((el) => Math.round(parseFloat(getComputedStyle(el).width)));
  const want = start + 4 + delta;
  const needle = `width: ${want}px`;
  expect(readFileSync(ctx.file, 'utf8')).not.toContain(needle);
  const box = await handle.boundingBox();
  if (!box) throw new Error('no resize handle');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y, { steps: 2 });
  await expect(card).toHaveCSS('width', `${start + 4}px`);
  const seen = await watch(card, { kind: 'style', prop: 'width', want: `${want}px` });
  await clearStamps(page);
  await page.mouse.move(x + 4 + delta, y);
  const visible = (await seen()) - (await stampOf(page, 'pointermove'));
  const t0 = Date.now();
  await page.mouse.up();
  const bytes = (await bytesAt(ctx.file, (s) => s.includes(needle))) - t0;
  await settled(page, ctx);
  await expect(page.getByTestId('resize-label')).toHaveCount(0);
  return { visible, bytes };
}

test('edit latency R4: resize handle drag', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Resize');
  await page.getByLabel('Zoom', { exact: true }).selectOption('1');
  await expect.poll(() => page.locator('.artboard').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(1);
  await selectInFrame(page, '#c1');
  await resizeSample(page, ctx, 16);
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const sample = await resizeSample(page, ctx, i % 2 === 0 ? -30 : 26);
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('resize visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  record('resize bytes', bytes);
});

async function renameSample(page: Page, ctx: Ctx, from: string, to: string): Promise<{ visible: number; bytes: number }> {
  const needle = `data-name="${to}"`;
  expect(readFileSync(ctx.file, 'utf8')).not.toContain(needle);
  await page.locator('.layers-row', { hasText: from }).first().dblclick();
  const input = page.getByLabel('Layer name');
  await expect(input).toBeFocused();
  await input.fill(to);
  const row = page.locator('.layers-list');
  const seen = await watch(row, { kind: 'text', want: to });
  await clearStamps(page);
  const t0 = Date.now();
  await input.press('Enter');
  const bytes = (await bytesAt(ctx.file, (s) => s.includes(needle))) - t0;
  const visible = (await seen()) - (await stampOf(page, 'key:Enter'));
  await settled(page, ctx);
  await expect(page.locator('.layers-list')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.layers-row', { hasText: to })).toHaveCount(1);
  return { visible, bytes };
}

test('edit latency R4: layers rename', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Rename');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  let name = 'Section title';
  await renameSample(page, ctx, name, 'Warm name');
  name = 'Warm name';
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const next = `Title ${i}`;
    const sample = await renameSample(page, ctx, name, next);
    name = next;
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('rename visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  record('rename bytes', bytes);
});

function order(source: string): string[] {
  return [...source.matchAll(/id="(c\d)"/g)].map((m) => m[1] ?? '');
}

async function moveSample(page: Page, ctx: Ctx, down: boolean): Promise<{ visible: number; bytes: number }> {
  const want = down ? ['c2', 'c1', 'c3'] : ['c1', 'c2', 'c3'];
  expect(order(readFileSync(ctx.file, 'utf8'))).not.toEqual(want);
  const seen = await watchSwap(page);
  await focusStudio(page);
  await clearStamps(page);
  const key = down ? 'Alt+ArrowDown' : 'Alt+ArrowUp';
  const t0 = Date.now();
  await page.keyboard.press(key);
  const bytes = (await bytesAt(ctx.file, (s) => order(s).join() === want.join())) - t0;
  const visible = (await seen()) - (await stampOf(page, down ? 'key:ArrowDown' : 'key:ArrowUp'));
  await expect(frontFrame(page).locator('.cards > article').nth(down ? 1 : 0)).toHaveText('Card one');
  await settled(page, ctx);
  await expect(page.getByLabel('Text content')).toHaveValue('Card one');
  return { visible, bytes };
}

test('edit latency R4: Alt+Down and Alt+Up move', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Move');
  await selectInFrame(page, '#c1');
  await moveSample(page, ctx, true);
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const sample = await moveSample(page, ctx, i % 2 === 1);
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('move visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  record('move bytes', bytes);
});

async function undoSample(page: Page, ctx: Ctx, size: number): Promise<{ visible: number; bytes: number }> {
  await selectInFrame(page, 'h1');
  const before = readFileSync(ctx.file, 'utf8');
  const field = page.getByLabel('Font size', { exact: true });
  await field.fill(String(size));
  await field.press('Enter');
  await expect.poll(() => readFileSync(ctx.file, 'utf8')).toContain(`font-size: ${size}px`);
  await settled(page, ctx);
  await focusCanvas(page);
  const seen = await watchSwap(page);
  await clearStamps(page);
  const t0 = Date.now();
  await page.keyboard.press('ControlOrMeta+z');
  const bytes = (await bytesAt(ctx.file, (s) => s === before)) - t0;
  const visible = (await seen()) - (await stampOf(page, 'key:z'));
  await expect(frontFrame(page).locator('h1')).toHaveCSS('font-size', '32px');
  await settled(page, ctx);
  return { visible, bytes };
}

test('edit latency R4: Cmd+Z undo', async ({ page }) => {
  const ctx = await htmlProject(page, 'Latency Undo');
  await undoSample(page, ctx, 41);
  const visible: number[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const sample = await undoSample(page, ctx, 43 + i);
    visible.push(sample.visible);
    bytes.push(sample.bytes);
  }
  expect(record('undo visible', visible).p95).toBeLessThanOrEqual(TARGET_MS);
  record('undo bytes', bytes);
});
