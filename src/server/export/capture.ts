import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEV_CHROME_SELECTOR } from '../../shared/app.js';
import type { ExportFrame, ExportScale, ExportScope } from '../../shared/export.js';
import type { RenderClip } from '../../shared/render-rpc.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';
import { withPagePath } from './source.js';

const MAX_OUTPUT_PIXELS = 80_000_000;
const HIDE_DEV_CHROME = `(() => { const style = document.createElement('style'); style.textContent = ${JSON.stringify(`${DEV_CHROME_SELECTOR} { display: none !important; }`)}; document.head.append(style); return true; })()`;
const READY_EXPRESSION = `(async () => {
  try { await document.fonts.ready; } catch (error) {}
  await Promise.all([...document.images].filter((img) => !img.complete).map((img) => new Promise((done) => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); setTimeout(done, 3000); })));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return true;
})()`;
const PAGE_SIZE_EXPRESSION = '[Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0), Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)]';

export interface Shot {
  frame: ExportFrame;
  png: Buffer;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  cropped: boolean;
}

export function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.readUInt32BE(12) !== 0x49484452) throw new Error('not a PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function selectorClipExpression(selector: string, padding: number): string {
  return `(() => {
    let element = null;
    try { element = document.querySelector(${JSON.stringify(selector)}); } catch (error) { return null; }
    if (!element) return null;
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return null;
    const pad = ${JSON.stringify(padding)};
    const root = document.documentElement;
    const right = Math.max(root.scrollWidth, window.innerWidth);
    const bottom = Math.max(root.scrollHeight, window.innerHeight);
    const x = Math.max(0, box.left + window.scrollX - pad);
    const y = Math.max(0, box.top + window.scrollY - pad);
    return { x, y, width: Math.min(right, box.right + window.scrollX + pad) - x, height: Math.min(bottom, box.bottom + window.scrollY + pad) - y };
  })()`;
}

export async function waitForPage(page: { evaluate<T>(expression: string): Promise<T> }): Promise<void> {
  await Promise.race([page.evaluate(READY_EXPRESSION).catch(() => undefined), new Promise((done) => setTimeout(done, 8000).unref())]);
}

export async function captureFrame(preview: PreviewService, url: string, frame: ExportFrame, scale: ExportScale, scope: ExportScope, selector?: string, maxCssHeight?: number, padding = 0): Promise<Shot> {
  if (!preview.withPage) throw new Error('this preview backend cannot export images');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'studio-export-'));
  const out = path.join(dir, 'shot.png');
  try {
    return await preview.withPage(withPagePath(url, frame.path), { width: frame.width, height: frame.height, scale }, async (page) => {
      await waitForPage(page);
      await page.evaluate(HIDE_DEV_CHROME).catch(() => undefined);
      let clip: RenderClip;
      if (selector) {
        const found = await page.evaluate<RenderClip | null>(selectorClipExpression(selector, padding));
        if (!found) throw new BadRequestError('The selected element is not on this page');
        clip = found;
      } else if (scope === 'frame') {
        clip = { x: 0, y: 0, width: frame.width, height: frame.height };
      } else {
        const [, pageHeight] = await page.evaluate<[number, number]>(PAGE_SIZE_EXPRESSION);
        clip = { x: 0, y: 0, width: frame.width, height: Math.max(frame.height, Math.ceil(pageHeight)) };
      }
      const maxHeight = Math.min(maxCssHeight ?? Infinity, Math.floor(MAX_OUTPUT_PIXELS / (clip.width * scale * scale)));
      const cropped = clip.height > maxHeight;
      if (cropped) clip = { ...clip, height: maxHeight };
      if (selector && (clip.width < 1 || clip.height < 1)) throw new BadRequestError(`The selected element has no visible area on the page at ${frame.width} px wide (it is off the page or has no size there).`);
      clip = { x: Math.round(clip.x), y: Math.round(clip.y), width: Math.max(1, Math.round(clip.width)), height: Math.max(1, Math.round(clip.height)) };
      await page.screenshot(out, clip);
      const png = await readFile(out);
      const size = pngDimensions(png);
      return { frame, png, ...size, cssWidth: clip.width, cssHeight: clip.height, cropped };
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
