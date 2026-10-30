import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BRIDGE_PARENT_ORIGIN_PARAM, BRIDGE_TOKEN_PARAM } from '../../shared/contracts.js';
import type { CheckViewport, QualityFinding, RenderCheckResult } from '../../shared/contracts.js';
import type { PlaceholderMode } from '../../shared/run-levels.js';
import { runAxe, runSharedAxe, type AxeViolation } from './axe.js';
import { CaptureCache, cacheKey, type Stamps } from './capture-cache.js';
import { layoutProbeExpression, type LayoutProbeResult } from './layout-probe.js';
import { duplicateFindings, genericFindings, placeholderFindings, tapFindings } from './quality.js';
import { dropOutsideApp } from './app-source-filter.js';
import { qualityProbeExpression, type ProbeRect, type QualityProbeResult } from './quality-probe.js';
import { createRenderBackend, type RenderBackend, type RenderPage } from './render-backend.js';
import { WarmPages } from './page-pool.js';
import { renderSettledFor } from './render-wait.js';
import { expandScrollRoot } from './scroll-root.js';
import { PeekPages } from './peek-pages.js';
import { waitForPage } from '../export/capture.js';
import type { RenderClip } from '../../shared/render-rpc.js';

const SERVER_TOKEN = 'server';
const QUIET_EXPRESSION = `new Promise((resolve) => {
  let timer = 0;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(done, 80); });
  const cap = setTimeout(done, 1000);
  function done() { observer.disconnect(); clearTimeout(cap); clearTimeout(timer); Promise.resolve(document.fonts ? document.fonts.ready : null).then(() => resolve(true)); }
  observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); timer = setTimeout(done, 80); }));
})`;
const WAIT_FOR_HYDRATION_EXPRESSION = `new Promise((resolve) => {
  const isNext = Boolean(window.__next_f || document.querySelector('script[src*="/_next/"]'));
  const hydrated = () => {
    const nodes = [...document.querySelectorAll('main *, body > div *')].slice(0, 300);
    const live = nodes.filter((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber$'))).length;
    return live >= nodes.length * 0.9;
  };
  if (!isNext || hydrated()) return resolve(false);
  const started = Date.now();
  const timer = setInterval(() => { if (hydrated() || Date.now() - started > 5000) { clearInterval(timer); resolve(true); } }, 50);
})`;
const OVERFLOW_EXPRESSION = 'document.documentElement.scrollWidth > window.innerWidth + 1';
const PAGE_HEIGHT_EXPRESSION = 'Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)';

interface ViewportSpec {
  viewport: CheckViewport;
  width: number;
  height: number;
}

const VIEWPORT_SPECS: Record<CheckViewport, ViewportSpec> = {
  desktop: { viewport: 'desktop', width: 1440, height: 900 },
  tablet: { viewport: 'tablet', width: 768, height: 1024 },
  mobile: { viewport: 'mobile', width: 390, height: 844 },
};

const RENDER_VIEWPORTS: ViewportSpec[] = [VIEWPORT_SPECS.desktop, VIEWPORT_SPECS.mobile];

export interface RenderCheckOptions {
  viewports?: CheckViewport[];
  quality?: boolean;
  placeholder?: PlaceholderMode;
  selectionLocs?: string[];
  url?: string;
  filePrefix?: string;
  prepare?: string;
  fresh?: boolean;
  appOnly?: boolean;
}

interface PageInspection {
  quality: QualityFinding[];
  nav: QualityProbeResult['nav'];
  selectionRects: ProbeRect[];
  timingsMs: Record<string, number>;
}

const PROBE_CAP = 8;
const APP_PROBE_CAP_BEFORE_FILTER = 120;
const CAPPED_AFTER_FILTER = new Set(['tap-target', 'placeholder']);

export interface InspectResult {
  path: string;
  selectionRects: ProbeRect[];
  nav: QualityProbeResult['nav'];
}

async function timed<T>(timings: Record<string, number>, name: string, task: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await task();
  } finally {
    timings[name] = Date.now() - started;
  }
}

function wantsAxe(viewport: CheckViewport): boolean {
  return viewport !== 'tablet';
}

function capProbeFindings(findings: QualityFinding[]): QualityFinding[] {
  const seen = new Map<string, number>();
  return findings.filter((finding) => {
    if (!CAPPED_AFTER_FILTER.has(finding.check)) return true;
    const count = (seen.get(finding.check) ?? 0) + 1;
    seen.set(finding.check, count);
    return count <= PROBE_CAP;
  });
}

async function inspectQuality(page: RenderPage, spec: ViewportSpec, options: RenderCheckOptions, timings: Record<string, number>, shared?: () => Promise<AxeViolation[]>): Promise<PageInspection> {
  const placeholder = options.placeholder ?? 'off';
  const probe = await timed(timings, 'probe', () =>
    page.evaluate<QualityProbeResult>(
      qualityProbeExpression({
        tapTargets: spec.viewport !== 'desktop',
        placeholder: placeholder !== 'off' && spec.viewport === 'desktop',
        layout: options.quality === true && spec.viewport === 'desktop',
        duplicates: options.quality === true,
        selectionLocs: options.selectionLocs ?? [],
        cap: options.appOnly ? APP_PROBE_CAP_BEFORE_FILTER : PROBE_CAP,
      }),
    ),
  );
  const axe = options.quality && wantsAxe(spec.viewport) ? await timed(timings, 'axe', () => runAxe(page, spec.viewport, shared)) : [];
  const placeholders = placeholderFindings(probe.placeholder, placeholder, spec.viewport);
  const found = options.quality ? [...axe, ...tapFindings(probe.tap, spec.viewport), ...placeholders, ...genericFindings(probe.generic ?? []), ...duplicateFindings(probe.duplicates ?? [], spec.viewport)] : placeholders;
  const quality = options.appOnly ? capProbeFindings(await timed(timings, 'appSource', () => dropOutsideApp(page, found))) : found;
  return { quality, nav: probe.nav, selectionRects: probe.selectionRects, timingsMs: timings };
}

export interface TileRequest {
  viewport: { width: number; height: number };
  tileHeight: number;
  from: number;
  maxTiles: number;
  outPrefix: string;
  theme?: 'light' | 'dark';
  still?: boolean;
  prepare?: string;
  format?: 'png' | 'jpeg';
  fresh?: boolean;
}

export interface TileResult {
  paths: string[];
  pageHeight: number;
  from: number;
  to: number;
  cached?: boolean;
}

export function planTiles(pageHeight: number, tileHeight: number, from: number, maxTiles: number): { y: number; height: number }[] {
  const start = Math.max(0, Math.min(Math.floor(from), Math.max(0, pageHeight - 1)));
  const tiles: { y: number; height: number }[] = [];
  for (let y = start; y < pageHeight && tiles.length < maxTiles; y += tileHeight) {
    tiles.push({ y, height: Math.min(tileHeight, pageHeight - y) });
  }
  return tiles;
}

const STILL_EXPRESSION = `(async () => {
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }';
  document.head.appendChild(style);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  await document.fonts?.ready;
  return true;
})()`;
const DARK_THEME_EXPRESSION = `(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.documentElement.classList.add('dark'); return true; })()`;

const EMPTY_PROBE: LayoutProbeResult = { findings: [], total: 0 };

interface ViewportState {
  url: string;
  horizontalOverflow: boolean;
  probe: LayoutProbeResult;
  inspection: PageInspection | null;
  timings: Record<string, number>;
  pageErrors: string[];
  stamp: string | null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withServerBridgeParams(url: string, parentOrigin: string): string {
  const target = new URL(url);
  target.searchParams.set(BRIDGE_TOKEN_PARAM, SERVER_TOKEN);
  target.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, parentOrigin);
  return target.toString();
}

function withInspection(inspection: PageInspection | null, timings: Record<string, number>, started: number): Partial<RenderCheckResult> {
  timings['total'] = Date.now() - started;
  if (!inspection) return { timingsMs: timings };
  return { quality: inspection.quality, nav: inspection.nav, timingsMs: timings, selectionRects: inspection.selectionRects };
}

const SHOT_PAD = 8;
const SHOT_MAX = { width: 1200, height: 900 };

export function elementClipsExpression(selectors: string[]): string {
  return `(() => ${JSON.stringify(selectors)}.map((selector) => {
    let element = null;
    try { element = document.querySelector(selector); } catch (error) { return null; }
    if (!element) return null;
    const box = element.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return null;
    const x = Math.max(0, box.left + window.scrollX - ${SHOT_PAD});
    const y = Math.max(0, box.top + window.scrollY - ${SHOT_PAD});
    const width = Math.min(box.width + ${SHOT_PAD * 2}, ${SHOT_MAX.width}, document.documentElement.scrollWidth - x);
    const height = Math.min(box.height + ${SHOT_PAD * 2}, ${SHOT_MAX.height});
    return width >= 2 && height >= 2 ? { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) } : null;
  }))()`;
}

async function settle(page: RenderPage): Promise<void> {
  await page.evaluate(QUIET_EXPRESSION).catch(() => undefined);
}

async function settleApp(page: RenderPage): Promise<void> {
  const waited = await page.evaluate<boolean>(WAIT_FOR_HYDRATION_EXPRESSION).catch(() => false);
  if (waited) await settle(page);
}

const CAPTURE_DIR = path.join(os.tmpdir(), 'design-studio-captures', String(process.pid));

type SourceStamp = { key: string; newest: number | null };

const SETTLE_GUARD_MS = 1000;

function usable(stamp: SourceStamp | null, fresh: boolean | undefined): string | null {
  if (!stamp) return null;
  return fresh && stamp.newest === null ? null : stamp.key;
}

type CachedCheck = Omit<RenderCheckResult, 'screenshotPath'>;
type CachedTiles = Omit<TileResult, 'paths'> & { count: number };

function checkKey(url: string, spec: ViewportSpec, options: RenderCheckOptions): string {
  return cacheKey({ url, viewport: spec.viewport, quality: options.quality === true, placeholder: options.placeholder ?? 'off', selection: options.selectionLocs ?? [], prepare: options.prepare ?? '', appOnly: options.appOnly === true });
}

function tileKey(url: string, request: TileRequest): string {
  const { outPrefix: _out, fresh: _fresh, ...rest } = request;
  return cacheKey({ url, ...rest });
}

function tilePaths(outPrefix: string, count: number, ext: string): string[] {
  return Array.from({ length: count }, (_, index) => `${outPrefix}-${index + 1}${ext}`);
}

export class BrowserPool {
  private backendPromise: Promise<RenderBackend> | null = null;
  private closed = false;
  private readonly pages = new WarmPages(() => this.backend());
  private readonly peeks = new PeekPages(
    async (url, viewport) => {
      const page = await this.pages.hold(viewport);
      try {
        await this.landPeek(page, url);
        return page;
      } catch (error) {
        await this.pages.release(page);
        throw error;
      }
    },
    (page) => this.pages.release(page),
    (page, url) => this.landPeek(page, url),
  );

  private async landPeek(page: RenderPage, url: string): Promise<void> {
    await page.goto(withServerBridgeParams(url, this.parentOrigin));
    await settle(page);
    await waitForPage(page);
    await this.noteLanded(page, url);
  }
  private readonly checks = new CaptureCache<CachedCheck>(path.join(CAPTURE_DIR, 'checks'));
  private readonly tiles = new CaptureCache<CachedTiles>(path.join(CAPTURE_DIR, 'tiles'));
  private readonly axeRuns = new Map<string, { stamp: string; run: Promise<AxeViolation[]> }>();

  constructor(
    private readonly parentOrigin: string,
    private readonly backendFactory: () => Promise<RenderBackend> = () => createRenderBackend(),
    private readonly stamps: Stamps = { stampFor: async () => null },
  ) {}

  backend(): Promise<RenderBackend> {
    if (this.closed) return Promise.reject(new Error('Browser pool is closed'));
    this.backendPromise ??= this.backendFactory().catch((error: unknown) => {
      this.backendPromise = null;
      throw error;
    });
    return this.backendPromise;
  }

  warm(): Promise<void> {
    return this.pages.prewarm({ width: 1440, height: 900 });
  }

  run<T>(url: string, viewport: { width: number; height: number; scale?: number }, task: (page: RenderPage) => Promise<T>): Promise<T> {
    return this.withPage(url, viewport, task);
  }

  peek<T>(url: string, viewport: { width: number; height: number }, task: (page: RenderPage) => Promise<T>): Promise<T> {
    return this.peeks.run(url, viewport, task);
  }

  sourcesChanged(at?: number, coldAt?: number): void {
    this.peeks.markDirty(at, coldAt);
  }

  private async withPage<T>(url: string, viewport: { width: number; height: number; scale?: number }, task: (page: RenderPage) => Promise<T>): Promise<T> {
    await renderSettledFor(url);
    return this.pages.lease(viewport, async (page) => {
      const stamp = (await this.stamps.stampFor(url))?.key ?? null;
      await page.goto(withServerBridgeParams(url, this.parentOrigin));
      await settle(page);
      await this.noteLanded(page, url);
      const shared: RenderPage = Object.assign(Object.create(page) as RenderPage, { axe: () => this.sharedAxe(page, url, viewport, '', stamp) });
      return task(shared);
    });
  }

  private sharedAxe(page: RenderPage, url: string, size: { width: number; height: number }, prepare: string, stamp: string | null): Promise<AxeViolation[]> {
    if (!stamp) return runSharedAxe(page);
    const key = cacheKey({ url, width: size.width, height: size.height, prepare });
    const known = this.axeRuns.get(key);
    if (known?.stamp === stamp) return known.run;
    const run = runSharedAxe(page);
    this.axeRuns.set(key, { stamp, run });
    run.catch(() => this.axeRuns.delete(key));
    if (this.axeRuns.size > 400) this.axeRuns.delete(this.axeRuns.keys().next().value as string);
    return run;
  }

  async screenshot(url: string, viewport: { width: number; height: number }, outPath: string): Promise<string> {
    return this.withPage(url, viewport, async (page) => {
      await mkdir(path.dirname(outPath), { recursive: true });
      await expandScrollRoot(page);
      await page.screenshot(outPath);
      return outPath;
    });
  }

  async elementShots(url: string, viewport: { width: number; height: number }, selectors: string[], outPrefix: string): Promise<(string | null)[]> {
    return this.withPage(url, viewport, async (page) => {
      await expandScrollRoot(page);
      const clips = await page.evaluate<(RenderClip | null)[]>(elementClipsExpression(selectors));
      await mkdir(path.dirname(outPrefix), { recursive: true });
      const out: (string | null)[] = [];
      for (const [index, clip] of clips.entries()) {
        if (!clip) {
          out.push(null);
          continue;
        }
        const outPath = `${outPrefix}-${index}.png`;
        await page.screenshot(outPath, clip);
        out.push(outPath);
      }
      return out;
    });
  }

  async screenshotTiles(url: string, request: TileRequest): Promise<TileResult> {
    await renderSettledFor(url);
    const key = tileKey(url, request);
    const ext = request.format === 'jpeg' ? '.jpg' : '.png';
    const started = Date.now();
    const before = await this.stamps.stampFor(url);
    const stamp = usable(before, request.fresh);
    const known = this.tiles.peek(key, stamp);
    if (known) {
      const paths = tilePaths(request.outPrefix, known.count, ext);
      if (await this.tiles.hit(key, stamp, paths)) return { paths, pageHeight: known.pageHeight, from: known.from, to: known.to, cached: true };
    }
    const result = await this.captureTiles(url, request, ext);
    const keep = await this.storable(url, before, started);
    if (keep) await this.tiles.store(key, keep, { pageHeight: result.pageHeight, from: result.from, to: result.to, count: result.paths.length }, result.paths);
    return result;
  }

  private async captureTiles(url: string, request: TileRequest, ext: string): Promise<TileResult> {
    return this.withPage(url, request.viewport, async (page) => {
      if (request.prepare) await page.evaluate(request.prepare).catch(() => undefined);
      if (request.theme === 'dark') {
        await page.evaluate(DARK_THEME_EXPRESSION);
        await settle(page);
      }
      if (request.still) {
        await page.evaluate(STILL_EXPRESSION).catch(() => undefined);
        await settle(page);
      }
      await expandScrollRoot(page);
      const pageHeight = await page.evaluate<number>(PAGE_HEIGHT_EXPRESSION);
      const tiles = planTiles(pageHeight, request.tileHeight, request.from, request.maxTiles);
      await mkdir(path.dirname(request.outPrefix), { recursive: true });
      const paths = tilePaths(request.outPrefix, tiles.length, ext);
      for (const [index, tile] of tiles.entries()) await page.screenshot(paths[index] as string, { x: 0, y: tile.y, width: request.viewport.width, height: tile.height });
      const last = tiles[tiles.length - 1];
      return { paths, pageHeight, from: tiles[0]?.y ?? 0, to: last ? last.y + last.height : 0 };
    });
  }

  private async probeViewport(page: RenderPage, spec: ViewportSpec, screenshotPath: string, options: RenderCheckOptions, state: ViewportState): Promise<void> {
    await timed(state.timings, 'goto', () => page.goto(withServerBridgeParams(state.url, this.parentOrigin)));
    const nav = page.lastNav?.();
    if (nav) Object.assign(state.timings, { load: nav.loadMs, idle: nav.idleMs });
    await timed(state.timings, 'settle', () => settle(page));
    if (options.appOnly) await timed(state.timings, 'hydrate', () => settleApp(page));
    await this.noteLanded(page, state.url);
    if (options.prepare) await timed(state.timings, 'prepare', () => page.evaluate(options.prepare as string));
    state.horizontalOverflow = await page.evaluate<boolean>(OVERFLOW_EXPRESSION);
    state.probe = await page.evaluate<LayoutProbeResult>(layoutProbeExpression()).catch((error: unknown) => {
      state.pageErrors.push(`layout probe failed: ${errorText(error)}`);
      return EMPTY_PROBE;
    });
    if (options.appOnly && state.probe.findings.length) {
      const kept = await dropOutsideApp(page, state.probe.findings);
      state.probe = { ...state.probe, findings: kept, total: Math.max(kept.length, state.probe.total - (state.probe.findings.length - kept.length)) };
    }
    const shared = () => this.sharedAxe(page, state.url, spec, options.prepare ?? '', state.stamp);
    state.inspection = await inspectQuality(page, spec, options, state.timings, shared).catch((error: unknown) => {
      state.pageErrors.push(`quality probe failed: ${errorText(error)}`);
      return null;
    });
    await timed(state.timings, 'screenshot', async () => {
      await expandScrollRoot(page);
      await page.screenshot(screenshotPath);
    });
  }

  private async checkViewport(url: string, spec: ViewportSpec, screenshotPath: string, options: RenderCheckOptions = {}): Promise<RenderCheckResult> {
    await renderSettledFor(url);
    const started = Date.now();
    const key = checkKey(url, spec, options);
    const before = await this.stamps.stampFor(url);
    const stamp = usable(before, options.fresh);
    const known = await this.checks.hit(key, stamp, [screenshotPath]);
    if (known) return { ...known, screenshotPath, cached: true, timingsMs: { cached: Date.now() - started } };
    const result = await this.renderViewport(url, spec, screenshotPath, options, started, before?.key ?? null);
    const keep = await this.storable(url, before, started);
    if (keep) {
      const { screenshotPath: _path, ...value } = result;
      await this.checks.store(key, keep, value, [screenshotPath]);
    }
    return result;
  }

  private async storable(url: string, before: SourceStamp | null, started: number): Promise<string | null> {
    const after = await this.stamps.stampFor(url);
    if (!after) return null;
    if (after.newest !== null) return after.newest < started - SETTLE_GUARD_MS ? after.key : null;
    return before?.key === after.key ? after.key : null;
  }

  private async noteLanded(page: RenderPage, url: string): Promise<void> {
    if (!this.stamps.landed) return;
    const href = await page.evaluate<string>('location.href').catch(() => null);
    if (href) this.stamps.landed(url, href);
  }

  private async renderViewport(url: string, spec: ViewportSpec, screenshotPath: string, options: RenderCheckOptions, started: number, stamp: string | null): Promise<RenderCheckResult> {
    const backend = await this.backend();
    const state: ViewportState = { url, horizontalOverflow: false, probe: EMPTY_PROBE, inspection: null, timings: {}, pageErrors: [], stamp: options.fresh ? null : stamp };
    let consoleErrors: string[] = [];
    await this.pages.lease({ width: spec.width, height: spec.height }, async (page) => {
      state.timings['open'] = Date.now() - started;
      await this.probeViewport(page, spec, screenshotPath, options, state).catch((error: unknown) => {
        state.pageErrors.push(errorText(error));
      });
      const collected = await page.errors();
      consoleErrors = collected.consoleErrors;
      state.pageErrors.unshift(...collected.pageErrors);
    });
    return {
      viewport: spec.viewport,
      width: spec.width,
      height: spec.height,
      ok: consoleErrors.length === 0 && state.pageErrors.length === 0 && !state.horizontalOverflow,
      consoleErrors,
      pageErrors: state.pageErrors,
      horizontalOverflow: state.horizontalOverflow,
      layout: state.probe.findings,
      layoutTotal: state.probe.total,
      screenshotPath,
      backend: backend.name,
      ...withInspection(state.inspection, state.timings, started),
    };
  }

  async renderCheck(url: string, outDir: string, filePrefix: string, options: RenderCheckOptions = {}): Promise<RenderCheckResult[]> {
    await mkdir(outDir, { recursive: true });
    const specs = options.viewports ? options.viewports.map((viewport) => VIEWPORT_SPECS[viewport]) : RENDER_VIEWPORTS;
    return Promise.all(specs.map((spec) => this.checkViewport(url, spec, path.join(outDir, `${filePrefix}-${spec.viewport}.png`), options)));
  }

  async inspect(url: string, viewport: CheckViewport, outPath: string, selectionLocs: string[]): Promise<InspectResult> {
    const spec = VIEWPORT_SPECS[viewport];
    return this.withPage(url, { width: spec.width, height: spec.height }, async (page) => {
      const probe = await page.evaluate<QualityProbeResult>(qualityProbeExpression({ tapTargets: false, placeholder: false, selectionLocs, cap: 0 }));
      await mkdir(path.dirname(outPath), { recursive: true });
      await expandScrollRoot(page);
      await page.screenshot(outPath);
      return { path: outPath, selectionRects: probe.selectionRects, nav: probe.nav };
    });
  }

  async close(): Promise<void> {
    await this.peeks.close();
    this.closed = true;
    await this.pages.closeAll().catch(() => undefined);
    const pending = this.backendPromise;
    this.backendPromise = null;
    const backend = await pending?.catch(() => null);
    await backend?.close().catch(() => undefined);
  }
}
