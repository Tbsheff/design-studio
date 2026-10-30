import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import type { ExportFrame, ExportScope } from '../../shared/export.js';
import type { RenderPage } from '../preview/render-backend.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';
import { hideDevChrome, selectorClipExpression, waitForPage } from './capture.js';
import { scanExpression, type ScanRect, type ScanResult } from './page-scan.js';
import { planNative, type NativePlan } from './pptx-plan.js';
import { withPagePath } from './source.js';

export interface VectorRegion {
  frame: ExportFrame;
  scan: ScanResult;
  png: Buffer;
  scale: number;
  under?: Buffer;
  native?: NativePlan;
}

export interface VectorJob {
  frames: ExportFrame[];
  scope: ExportScope;
  selector?: string | undefined;
  slides: boolean;
  native?: boolean;
}

const MAX_ITEMS = 20_000;
const MAX_FONT_BYTES = 4 * 1024 * 1024;
const MAX_PAGE_HEIGHT = 16_000;
const MAX_PIXELS = 60_000_000;
const SLIDE_SELECTORS = ['[data-slide]', '.slide', '.slides > section', 'section.slide'];

const HIDE_TEXT = `(() => { const style = document.createElement('style'); style.textContent = '*, *::before, *::after { -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; } [data-ds-keep*="b"]::before, [data-ds-keep*="a"]::after { -webkit-text-fill-color: currentcolor !important; }'; document.head.append(style); return true; })()`;

function slidesExpression(width: number, height: number): string {
  return `(() => {
    const selectors = ${JSON.stringify(SLIDE_SELECTORS)};
    const rectOf = (el) => { const box = el.getBoundingClientRect(); return { x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height }; };
    for (const selector of selectors) {
      const found = Array.from(document.querySelectorAll(selector)).filter((el) => { const box = el.getBoundingClientRect(); return box.width > 50 && box.height > 50; });
      if (found.length >= 2) return found.map(rectOf);
    }
    const sections = Array.from(document.querySelectorAll('body > section, main > section, body > main > section')).map(rectOf).filter((box) => box.width >= ${width} * 0.9 && Math.abs(box.height - ${height}) <= ${height} * 0.1);
    return sections.length >= 2 ? sections : [];
  })()`;
}

function hideExpression(plan: NativePlan): string {
  const rule = (ids: number[], body: string): string => (ids.length > 0 ? `${ids.map((id) => `[data-ds-i="${id}"]`).join(',')}{${body}}` : '');
  const css = `${rule(plan.paint, 'background-color:transparent!important;border-color:transparent!important;box-shadow:none!important;background-image:none!important')}${rule(plan.gone, 'opacity:0!important')}`;
  return `(() => { const style = document.createElement('style'); style.id = 'ds-native-hide'; style.textContent = ${JSON.stringify(css)}; document.head.append(style); return true; })()`;
}

const UNHIDE = `(() => { document.getElementById('ds-native-hide')?.remove(); return true; })()`;
const NEXT_FRAME = 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))';

const PAGE_SIZE = '[Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)]';

async function regionsFor(page: RenderPage, frame: ExportFrame, job: VectorJob): Promise<ScanRect[]> {
  if (job.selector) {
    const found = await page.evaluate<ScanRect | null>(selectorClipExpression(job.selector, 0));
    if (!found || found.width < 1 || found.height < 1) throw new BadRequestError('The selected element is not on this page');
    return [found];
  }
  if (job.slides) {
    const slides = await page.evaluate<ScanRect[]>(slidesExpression(frame.width, frame.height));
    if (slides.length > 0) return slides.slice(0, 60);
  }
  if (job.scope === 'frame' || job.slides) return [{ x: 0, y: 0, width: frame.width, height: frame.height }];
  const [, pageHeight] = await page.evaluate<[number, number]>(PAGE_SIZE);
  return [{ x: 0, y: 0, width: frame.width, height: Math.min(MAX_PAGE_HEIGHT, Math.max(frame.height, Math.ceil(pageHeight))) }];
}

function snap(rect: ScanRect): ScanRect {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  return { x, y, width: Math.max(1, Math.ceil(rect.x + rect.width) - x), height: Math.max(1, Math.ceil(rect.y + rect.height) - y) };
}

async function shoot(page: RenderPage, dir: string, name: string, region: ScanRect): Promise<Buffer> {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot(file, region);
  return readFile(file);
}

async function nativeRegion(page: RenderPage, dir: string, index: number, region: ScanRect, base: VectorRegion): Promise<VectorRegion> {
  const native = planNative(base.scan);
  if (native.shapes.length === 0) return base;
  await page.evaluate(hideExpression(native));
  await page.evaluate(NEXT_FRAME).catch(() => undefined);
  const png = await shoot(page, dir, `back-${index}`, region);
  await page.evaluate(UNHIDE);
  return { ...base, png, under: base.png, native };
}

async function scanFrame(page: RenderPage, frame: ExportFrame, job: VectorJob, scale: number, dir: string): Promise<VectorRegion[]> {
  await waitForPage(page);
  await hideDevChrome(page);
  const regions = (await regionsFor(page, frame, job)).map(snap);
  const root = job.selector ?? null;
  const scans: ScanResult[] = [];
  for (const region of regions) scans.push(await page.evaluate<ScanResult>(scanExpression({ region, root, maxItems: MAX_ITEMS, maxFontBytes: MAX_FONT_BYTES, embedFonts: true, ...(job.native ? { native: true } : {}) })));
  await page.evaluate(HIDE_TEXT);
  await page.evaluate(NEXT_FRAME).catch(() => undefined);
  const out: VectorRegion[] = [];
  for (const [index, region] of regions.entries()) {
    const scan = scans[index];
    if (!scan) continue;
    const base: VectorRegion = { frame, scan, png: await shoot(page, dir, `region-${index}`, region), scale };
    out.push(job.native ? await nativeRegion(page, dir, index, region, base) : base);
  }
  return out;
}

function scaleFor(frame: ExportFrame, job: VectorJob): number {
  if (job.scope === 'page' && !job.slides && !job.selector) return Math.max(1, Math.min(2, Math.sqrt(MAX_PIXELS / (frame.width * MAX_PAGE_HEIGHT))));
  return 2;
}

export async function captureVector(preview: PreviewService, url: string, job: VectorJob): Promise<VectorRegion[]> {
  if (!preview.withPage) throw new Error('this preview backend cannot export');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'studio-vector-'));
  try {
    const out: VectorRegion[] = [];
    for (const frame of job.frames) {
      const scale = scaleFor(frame, job);
      out.push(...(await preview.withPage(withPagePath(url, frame.path), { width: frame.width, height: frame.height, scale }, (page) => scanFrame(page, frame, job, scale, dir))));
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function cropPng(source: PNG, rect: ScanRect, scale: number): Buffer | null {
  const x = Math.max(0, Math.floor(rect.x * scale));
  const y = Math.max(0, Math.floor(rect.y * scale));
  const width = Math.min(source.width - x, Math.ceil(rect.width * scale));
  const height = Math.min(source.height - y, Math.ceil(rect.height * scale));
  if (width < 1 || height < 1) return null;
  const out = new PNG({ width, height });
  PNG.bitblt(source, out, x, y, width, height, 0, 0);
  return PNG.sync.write(out);
}
