import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { startRenderHost, stopRenderHost } from '../e2e/support/render-host.js';
import type { QualityFinding, RenderCheckResult } from '../src/shared/contracts.js';
import type { RenderErrors } from '../src/shared/render-rpc.js';
import { BrowserPool } from '../src/server/preview/browser.js';
import { NAVIGATION_TIMEOUT_MS, SETTLE_TIMEOUT_MS, type RenderBackend, type RenderPage } from '../src/server/preview/render-backend.js';
import { createElectronBackend } from '../src/server/preview/render-electron.js';
import { createPlaywrightBackend } from '../src/server/preview/render-playwright.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const REAL_PAGES = ['g-after-polish.html', 'h-after-polish.html'];
const REAL_PAGES_DIR = process.env.STUDIO_PARITY_PAGES_DIR ?? path.join(ROOT, 'design-review', 'taste-runs', 'levels');
const LIMIT_PCT = 0.5;
const BACKENDS = ['chrome', 'electron', 'playwrightElectron'] as const;
type Backend = (typeof BACKENDS)[number];
type Shots = Record<Backend, PNG>;

interface PixelRow {
  page: string;
  width: number;
  pipelinePct: number;
  enginePct: number;
  sizes: string;
}

function collectPages(work: string): Map<string, string> {
  const pages = new Map<string, string>();
  const fixtures = path.join(ROOT, 'e2e', 'fixtures');
  for (const name of readdirSync(fixtures).filter((file) => file.endsWith('.html'))) pages.set(`fixture/${name}`, readFileSync(path.join(fixtures, name), 'utf8'));
  for (const name of REAL_PAGES) {
    const source = path.join(REAL_PAGES_DIR, name);
    if (!existsSync(source)) {
      console.log(`[render-parity] skip real/${name}: ${source} not found`);
      continue;
    }
    const dir = path.join(work, 'data', 'projects', name.replace('.html', ''));
    mkdirSync(dir, { recursive: true });
    cpSync(source, path.join(dir, 'index.html'));
    pages.set(`real/${name}`, readFileSync(path.join(dir, 'index.html'), 'utf8'));
  }
  return pages;
}

function serve(pages: Map<string, string>): Promise<Server> {
  const server = createServer((req, res) => {
    const key = decodeURIComponent((req.url ?? '').split('?')[0]?.slice(1) ?? '');
    const body = pages.get(key);
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body ?? '');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function wrapElectronPage(page: Page): RenderPage {
  const errors: RenderErrors = { consoleErrors: [], pageErrors: [] };
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => errors.pageErrors.push(error.stack ?? error.message));
  return {
    async goto(url) {
      await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined);
    },
    evaluate: <T>(expression: string) => page.evaluate<T>(expression),
    async screenshot(outPath, clip) {
      await page.screenshot({ path: outPath, fullPage: true, ...(clip ? { clip } : {}) });
    },
    errors: async () => ({ consoleErrors: [...errors.consoleErrors], pageErrors: [...errors.pageErrors] }),
    close: () => page.close().catch(() => undefined),
  };
}

function playwrightOnElectron(app: ElectronApplication): RenderBackend {
  let counter = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const openOne = async (viewport: { width: number; height: number }): Promise<RenderPage> => {
    counter += 1;
    const opened = app.waitForEvent('window');
    await app.evaluate(({ BrowserWindow }, args) => {
      const window = new BrowserWindow({ show: false, width: args.width, height: args.height, useContentSize: true, paintWhenInitiallyHidden: true, webPreferences: { partition: `pw-${args.counter}`, backgroundThrottling: false } });
      void window.loadURL('about:blank');
    }, { ...viewport, counter });
    const page = await opened;
    await page.setViewportSize(viewport);
    return wrapElectronPage(page);
  };
  return {
    name: 'playwright',
    open(viewport) {
      const next = queue.then(() => openOne(viewport));
      queue = next.catch(() => undefined);
      return next;
    },
    close: async () => undefined,
  };
}

function diffPct(a: PNG, b: PNG): number {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (image: PNG) => {
    const out = new PNG({ width, height });
    PNG.bitblt(image, out, 0, 0, width, height, 0, 0);
    return out.data;
  };
  const changed = pixelmatch(crop(a), crop(b), undefined, width, height, { threshold: 0.1 });
  const area = Math.max(a.width * a.height, b.width * b.height);
  return ((changed + area - width * height) / area) * 100;
}

function findingKeys(results: RenderCheckResult[], normalize: boolean): string[] {
  const clean = (text: string) => (normalize ? text.replace(/\d+x\d+ px/g, 'NxN px') : text);
  return results
    .flatMap((result) => [
      `${result.viewport} ok=${result.ok} overflow=${result.horizontalOverflow} layout=${result.layoutTotal} console=${result.consoleErrors.length} page=${result.pageErrors.length}`,
      ...(result.quality ?? []).map((finding: QualityFinding) => clean(`${finding.viewport} ${finding.check} ${finding.severity} ${finding.selector ?? ''} ${finding.message}`)),
    ])
    .sort();
}

function same(a: string[], b: string[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function shoot(pools: Record<Backend, BrowserPool>, url: string, size: { width: number; height: number }, dir: string): Promise<Shots> {
  const entries = await Promise.all(
    BACKENDS.map(async (backend) => {
      const file = await pools[backend].screenshot(url, size, path.join(dir, backend, `${size.width}.png`));
      return [backend, PNG.sync.read(readFileSync(file))] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as Shots;
}

async function checks(pools: Record<Backend, BrowserPool>, url: string, dir: string): Promise<Record<Backend, RenderCheckResult[]>> {
  const entries = await Promise.all(
    BACKENDS.map(async (backend) => [backend, await pools[backend].renderCheck(url, path.join(dir, backend), 'check', { viewports: ['desktop', 'tablet', 'mobile'], quality: true, placeholder: 'medium' })] as const),
  );
  return Object.fromEntries(entries) as Record<Backend, RenderCheckResult[]>;
}

async function main(): Promise<void> {
  const work = mkdtempSync(path.join(os.tmpdir(), 'studio-parity-'));
  const pages = collectPages(work);
  const server = await serve(pages);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const host = await startRenderHost();
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const pwApp = await electron.launch({ args: [path.join(ROOT, 'desktop', 'dist', 'render-host.js')], env });
  const pools: Record<Backend, BrowserPool> = {
    chrome: new BrowserPool(base, async () => createPlaywrightBackend()),
    electron: new BrowserPool(base, async () => createElectronBackend({ ...process.env, ...host.env })),
    playwrightElectron: new BrowserPool(base, async () => playwrightOnElectron(pwApp)),
  };
  const pixels: PixelRow[] = [];
  const findings: { page: string; pipelineSame: boolean; engineSame: boolean; engineSameIgnoringPx: boolean; count: number; engineDiff: string[] }[] = [];
  try {
    for (const name of pages.keys()) {
      const url = `${base}/${encodeURIComponent(name)}`;
      const dir = path.join(work, 'shots', name.replace('/', '-'));
      for (const size of SIZES) {
        const shots = await shoot(pools, url, size, dir);
        pixels.push({
          page: name,
          width: size.width,
          pipelinePct: Number(diffPct(shots.electron, shots.playwrightElectron).toFixed(3)),
          enginePct: Number(diffPct(shots.chrome, shots.electron).toFixed(3)),
          sizes: BACKENDS.map((backend) => `${shots[backend].width}x${shots[backend].height}`).join(' / '),
        });
      }
      const results = await checks(pools, url, dir);
      const raw = Object.fromEntries(BACKENDS.map((backend) => [backend, findingKeys(results[backend], false)])) as Record<Backend, string[]>;
      const chromeSet = new Set(raw.chrome);
      findings.push({
        page: name,
        pipelineSame: same(raw.electron, raw.playwrightElectron),
        engineSame: same(raw.chrome, raw.electron),
        engineSameIgnoringPx: same(findingKeys(results.chrome, true), findingKeys(results.electron, true)),
        count: raw.electron.length,
        engineDiff: raw.electron.filter((key) => !chromeSet.has(key)),
      });
    }
  } finally {
    await Promise.all(BACKENDS.map((backend) => pools[backend].close()));
    await pwApp.close();
    stopRenderHost(host.pid);
    server.close();
  }
  const worstPipeline = Math.max(...pixels.map((row) => row.pipelinePct));
  const worstEngine = Math.max(...pixels.map((row) => row.enginePct));
  const out = path.join(ROOT, 'test-results', 'render-parity.json');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ limitPct: LIMIT_PCT, worstPipeline, worstEngine, pixels, findings, work }, null, 2)}\n`);
  console.log('page                                     width  pipeline  engine   sizes (chrome / electron / playwright-on-electron)');
  for (const row of pixels) console.log(`${row.page.padEnd(40)} ${String(row.width).padStart(5)}  ${row.pipelinePct.toFixed(3).padStart(7)}%  ${row.enginePct.toFixed(3).padStart(6)}%  ${row.sizes}`);
  for (const row of findings) console.log(`${row.page.padEnd(40)} findings ${row.count}: pipeline ${row.pipelineSame ? 'same' : 'DIFFERENT'}, engine ${row.engineSame ? 'same' : row.engineSameIgnoringPx ? 'same except px sizes' : 'DIFFERENT'}`);
  console.log(`worst pipeline difference ${worstPipeline.toFixed(3)}% (limit ${LIMIT_PCT}%), worst engine difference ${worstEngine.toFixed(3)}%, report ${out}`);
  process.exit(worstPipeline >= LIMIT_PCT || findings.some((row) => !row.pipelineSame) ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
