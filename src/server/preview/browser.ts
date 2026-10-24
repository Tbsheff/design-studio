import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { BRIDGE_PARENT_ORIGIN_PARAM, BRIDGE_TOKEN_PARAM } from '../../shared/contracts.js';
import type { CheckViewport, QualityFinding, RenderCheckResult } from '../../shared/contracts.js';
import type { PlaceholderMode } from '../../shared/run-levels.js';
import { runAxe } from './axe.js';
import { layoutProbeExpression, type LayoutProbeResult } from './layout-probe.js';
import { duplicateFindings, genericFindings, placeholderFindings, tapFindings } from './quality.js';
import { qualityProbeExpression, type ProbeRect, type QualityProbeResult } from './quality-probe.js';
import { createRenderBackend, type RenderBackend, type RenderPage } from './render-backend.js';
import type { RenderClip } from '../../shared/render-rpc.js';

const SERVER_TOKEN = 'server';
const TWO_FRAMES = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))';
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
}

interface PageInspection {
  quality: QualityFinding[];
  nav: QualityProbeResult['nav'];
  selectionRects: ProbeRect[];
  timingsMs: Record<string, number>;
}

const PROBE_CAP = 8;

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

async function inspectQuality(page: RenderPage, spec: ViewportSpec, options: RenderCheckOptions, timings: Record<string, number>): Promise<PageInspection> {
  const placeholder = options.placeholder ?? 'off';
  const probe = await timed(timings, 'probe', () =>
    page.evaluate<QualityProbeResult>(
      qualityProbeExpression({
        tapTargets: spec.viewport !== 'desktop',
        placeholder: placeholder !== 'off' && spec.viewport === 'desktop',
        layout: options.quality === true && spec.viewport === 'desktop',
        duplicates: options.quality === true,
        selectionLocs: options.selectionLocs ?? [],
        cap: PROBE_CAP,
      }),
    ),
  );
  const axe = options.quality && wantsAxe(spec.viewport) ? await timed(timings, 'axe', () => runAxe(page, spec.viewport)) : [];
  const placeholders = placeholderFindings(probe.placeholder, placeholder, spec.viewport);
  const quality = options.quality ? [...axe, ...tapFindings(probe.tap, spec.viewport), ...placeholders, ...genericFindings(probe.generic ?? []), ...duplicateFindings(probe.duplicates ?? [], spec.viewport)] : placeholders;
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
}

export interface TileResult {
  paths: string[];
  pageHeight: number;
  from: number;
  to: number;
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
  await page.evaluate(TWO_FRAMES).catch(() => undefined);
}

export class BrowserPool {
  private backendPromise: Promise<RenderBackend> | null = null;
  private closed = false;

  constructor(
    private readonly parentOrigin: string,
    private readonly backendFactory: () => Promise<RenderBackend> = () => createRenderBackend(),
  ) {}

  backend(): Promise<RenderBackend> {
    if (this.closed) return Promise.reject(new Error('Browser pool is closed'));
    this.backendPromise ??= this.backendFactory().catch((error: unknown) => {
      this.backendPromise = null;
      throw error;
    });
    return this.backendPromise;
  }

  private async withPage<T>(url: string, viewport: { width: number; height: number }, task: (page: RenderPage) => Promise<T>): Promise<T> {
    const page = await (await this.backend()).open(viewport);
    try {
      await page.goto(withServerBridgeParams(url, this.parentOrigin));
      await settle(page);
      return await task(page);
    } finally {
      await page.close();
    }
  }

  async screenshot(url: string, viewport: { width: number; height: number }, outPath: string): Promise<string> {
    return this.withPage(url, viewport, async (page) => {
      await mkdir(path.dirname(outPath), { recursive: true });
      await page.screenshot(outPath);
      return outPath;
    });
  }

  async elementShots(url: string, viewport: { width: number; height: number }, selectors: string[], outPrefix: string): Promise<(string | null)[]> {
    return this.withPage(url, viewport, async (page) => {
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
    return this.withPage(url, request.viewport, async (page) => {
      if (request.theme === 'dark') {
        await page.evaluate(DARK_THEME_EXPRESSION);
        await settle(page);
      }
      if (request.still) {
        await page.evaluate(STILL_EXPRESSION).catch(() => undefined);
        await settle(page);
      }
      const pageHeight = await page.evaluate<number>(PAGE_HEIGHT_EXPRESSION);
      const tiles = planTiles(pageHeight, request.tileHeight, request.from, request.maxTiles);
      await mkdir(path.dirname(request.outPrefix), { recursive: true });
      const paths: string[] = [];
      for (const [index, tile] of tiles.entries()) {
        const outPath = `${request.outPrefix}-${index + 1}.png`;
        await page.screenshot(outPath, { x: 0, y: tile.y, width: request.viewport.width, height: tile.height });
        paths.push(outPath);
      }
      const last = tiles[tiles.length - 1];
      return { paths, pageHeight, from: tiles[0]?.y ?? 0, to: last ? last.y + last.height : 0 };
    });
  }

  private async probeViewport(page: RenderPage, spec: ViewportSpec, screenshotPath: string, options: RenderCheckOptions, state: ViewportState): Promise<void> {
    await page.goto(withServerBridgeParams(state.url, this.parentOrigin));
    await settle(page);
    state.horizontalOverflow = await page.evaluate<boolean>(OVERFLOW_EXPRESSION);
    state.probe = await page.evaluate<LayoutProbeResult>(layoutProbeExpression()).catch((error: unknown) => {
      state.pageErrors.push(`layout probe failed: ${errorText(error)}`);
      return EMPTY_PROBE;
    });
    state.inspection = await inspectQuality(page, spec, options, state.timings).catch((error: unknown) => {
      state.pageErrors.push(`quality probe failed: ${errorText(error)}`);
      return null;
    });
    await timed(state.timings, 'screenshot', () => page.screenshot(screenshotPath));
  }

  private async checkViewport(url: string, spec: ViewportSpec, screenshotPath: string, options: RenderCheckOptions = {}): Promise<RenderCheckResult> {
    const backend = await this.backend();
    const page = await backend.open({ width: spec.width, height: spec.height });
    const state: ViewportState = { url, horizontalOverflow: false, probe: EMPTY_PROBE, inspection: null, timings: {}, pageErrors: [] };
    const started = Date.now();
    let consoleErrors: string[] = [];
    try {
      await this.probeViewport(page, spec, screenshotPath, options, state).catch((error: unknown) => {
        state.pageErrors.push(errorText(error));
      });
      const collected = await page.errors();
      consoleErrors = collected.consoleErrors;
      state.pageErrors.unshift(...collected.pageErrors);
    } finally {
      await page.close();
    }
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
      await page.screenshot(outPath);
      return { path: outPath, selectionRects: probe.selectionRects, nav: probe.nav };
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    const pending = this.backendPromise;
    this.backendPromise = null;
    const backend = await pending?.catch(() => null);
    await backend?.close().catch(() => undefined);
  }
}
