import { readFile } from 'node:fs/promises';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { CheckViewport, QualityFinding } from '../../shared/contracts.js';
import type { ProbeRect } from './quality-probe.js';

const BAND_HEIGHT = 200;
const MASK_MARGIN = 24;
const UNEXPECTED_CHANGE_PCT = 1;

interface DiffBand {
  y: number;
  height: number;
  changedPct: number;
}

interface VisualDiff {
  comparedHeight: number;
  beforeHeight: number;
  afterHeight: number;
  changedPct: number;
  bands: DiffBand[];
}

function cropTo(png: PNG, width: number, height: number): Buffer {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) png.data.copy(out, y * width * 4, y * png.width * 4, y * png.width * 4 + width * 4);
  return out;
}

function maskRect(data: Buffer, width: number, height: number, rect: ProbeRect): void {
  const x0 = Math.max(0, Math.floor(rect.x - MASK_MARGIN));
  const x1 = Math.min(width, Math.ceil(rect.x + rect.width + MASK_MARGIN));
  const y0 = Math.max(0, Math.floor(rect.y - MASK_MARGIN));
  const y1 = Math.min(height, Math.ceil(rect.y + rect.height + MASK_MARGIN));
  for (let y = y0; y < y1; y += 1) data.fill(0, (y * width + x0) * 4, (y * width + x1) * 4);
}

function comparedHeightFor(before: PNG, after: PNG, masks: ProbeRect[]): number {
  const common = Math.min(before.height, after.height);
  if (before.height === after.height || masks.length === 0) return common;
  const firstMaskTop = Math.min(...masks.map((rect) => rect.y)) - MASK_MARGIN;
  return Math.max(0, Math.min(common, Math.floor(firstMaskTop)));
}

function bandsOf(diff: Buffer, width: number, height: number): DiffBand[] {
  const bands: DiffBand[] = [];
  for (let y = 0; y < height; y += BAND_HEIGHT) {
    const bandHeight = Math.min(BAND_HEIGHT, height - y);
    let changed = 0;
    for (let row = y; row < y + bandHeight; row += 1) {
      for (let x = 0; x < width; x += 1) if (diff[(row * width + x) * 4] === 255 && diff[(row * width + x) * 4 + 1] === 0) changed += 1;
    }
    const pct = (changed / (width * bandHeight)) * 100;
    if (pct >= 0.5) bands.push({ y, height: bandHeight, changedPct: Math.round(pct * 10) / 10 });
  }
  return bands;
}

export function diffImages(before: PNG, after: PNG, masks: ProbeRect[]): VisualDiff {
  const width = Math.min(before.width, after.width);
  const height = comparedHeightFor(before, after, masks);
  const base = { comparedHeight: height, beforeHeight: before.height, afterHeight: after.height };
  if (height === 0 || width === 0) return { ...base, changedPct: 0, bands: [] };
  const a = cropTo(before, width, height);
  const b = cropTo(after, width, height);
  for (const rect of masks) {
    maskRect(a, width, height, rect);
    maskRect(b, width, height, rect);
  }
  const diff = Buffer.alloc(width * height * 4);
  const changed = pixelmatch(a, b, diff, width, height, { threshold: 0.1, diffMask: true, diffColor: [255, 0, 0], diffColorAlt: [255, 0, 0] });
  const grown = masks.length === 0 ? Math.abs(before.height - after.height) : 0;
  const pct = ((changed + grown * width) / (width * (height + grown))) * 100;
  return { ...base, changedPct: Math.round(pct * 10) / 10, bands: [...bandsOf(diff, width, height), ...grownBands(height, grown)] };
}

function grownBands(from: number, rows: number): DiffBand[] {
  const bands: DiffBand[] = [];
  for (let y = from; y < from + rows; y += BAND_HEIGHT) bands.push({ y, height: Math.min(BAND_HEIGHT, from + rows - y), changedPct: 100 });
  return bands;
}

export interface DiffMask {
  png: Buffer;
  width: number;
  height: number;
  changed: number;
}

export function diffMask(before: PNG, after: PNG): DiffMask {
  const width = Math.min(before.width, after.width);
  const height = Math.min(before.height, after.height);
  const out = new PNG({ width: Math.max(1, width), height: Math.max(1, height) });
  if (width === 0 || height === 0) return { png: PNG.sync.write(out), width, height, changed: 0 };
  const changed = pixelmatch(cropTo(before, width, height), cropTo(after, width, height), out.data, width, height, { threshold: 0.1, diffMask: true, diffColor: [255, 0, 0], diffColorAlt: [255, 0, 0] });
  return { png: PNG.sync.write(out), width, height, changed };
}

export async function readPng(file: string): Promise<PNG> {
  return PNG.sync.read(await readFile(file));
}

function describeBands(bands: DiffBand[]): string {
  if (bands.length === 0) return '';
  return `; changed bands: ${bands.slice(0, 5).map((band) => `y=${band.y}-${band.y + band.height} (${band.changedPct}%)`).join(', ')}`;
}

export function diffFinding(diff: VisualDiff, viewport: CheckViewport, targeted: boolean): QualityFinding {
  const heightNote = diff.beforeHeight === diff.afterHeight ? '' : ` Page height changed from ${diff.beforeHeight} to ${diff.afterHeight} px; compared the top ${diff.comparedHeight} px.`;
  const unexpected = targeted && diff.changedPct >= UNEXPECTED_CHANGE_PCT;
  const scope = targeted ? 'outside the selected elements' : 'versus the previous version';
  return {
    check: 'visual-diff',
    severity: unexpected ? 'medium' : 'low',
    viewport,
    selector: null,
    source: null,
    message: `${diff.changedPct}% of pixels changed ${scope}${describeBands(diff.bands)}.${heightNote}${unexpected ? ' This change was not requested.' : ''}`,
    ...(unexpected ? { fix: 'Check that the edit stayed inside the requested scope, and undo unrelated changes.' } : {}),
  };
}

export function resizePng(source: PNG, width: number, height: number): PNG {
  const out = new PNG({ width, height });
  const sx = source.width / width;
  const sy = source.height / height;
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.min(source.height, Math.floor((y + 1) * sy)));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.min(source.width, Math.floor((x + 1) * sx)));
      averageInto(source, out.data, (y * width + x) * 4, { x0, x1, y0, y1 });
    }
  }
  return out;
}

function averageInto(source: PNG, target: Buffer, at: number, box: { x0: number; x1: number; y0: number; y1: number }): void {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      const i = (y * source.width + x) * 4;
      const alpha = (source.data[i + 3] ?? 255) / 255;
      r += (source.data[i] ?? 0) * alpha + 255 * (1 - alpha);
      g += (source.data[i + 1] ?? 0) * alpha + 255 * (1 - alpha);
      b += (source.data[i + 2] ?? 0) * alpha + 255 * (1 - alpha);
      count += 1;
    }
  }
  target[at] = Math.round(r / count);
  target[at + 1] = Math.round(g / count);
  target[at + 2] = Math.round(b / count);
  target[at + 3] = 255;
}

export function topOf(png: PNG, height: number): PNG {
  if (png.height <= height) return png;
  const out = new PNG({ width: png.width, height });
  png.data.copy(out.data, 0, 0, png.width * height * 4);
  return out;
}

const COMPARE_WIDTH = 480;
const GRID = 3;
const ROW_NAMES = ['top', 'middle', 'bottom'];
const COL_NAMES = ['left', 'center', 'right'];

export interface PictureRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  differsPct: number;
}

export interface PictureDiff {
  differsPct: number;
  regions: PictureRegion[];
  mask: Buffer;
  maskWidth: number;
  maskHeight: number;
}

export function diffPictures(reference: PNG, render: PNG): PictureDiff {
  const width = Math.min(COMPARE_WIDTH, reference.width);
  const height = Math.max(1, Math.round((reference.height * width) / reference.width));
  const a = resizePng(reference, width, height);
  const b = resizePng(render, width, height);
  const mask = Buffer.alloc(width * height * 4);
  const changed = pixelmatch(a.data, b.data, mask, width, height, { threshold: 0.15, diffMask: true, diffColor: [255, 0, 0], diffColorAlt: [255, 0, 0] });
  const scale = reference.width / width;
  return { differsPct: Math.round((changed / (width * height)) * 1000) / 10, regions: gridRegions(mask, width, height, scale), mask, maskWidth: width, maskHeight: height };
}

function isRed(mask: Buffer, index: number): boolean {
  return mask[index * 4] === 255 && mask[index * 4 + 1] === 0;
}

function gridRegions(mask: Buffer, width: number, height: number, scale: number): PictureRegion[] {
  const regions: PictureRegion[] = [];
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      const x0 = Math.floor((col * width) / GRID);
      const x1 = Math.floor(((col + 1) * width) / GRID);
      const y0 = Math.floor((row * height) / GRID);
      const y1 = Math.floor(((row + 1) * height) / GRID);
      let changed = 0;
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (isRed(mask, y * width + x)) changed += 1;
      const area = Math.max(1, (x1 - x0) * (y1 - y0));
      regions.push({ name: `${ROW_NAMES[row]} ${COL_NAMES[col]}`, x: Math.round(x0 * scale), y: Math.round(y0 * scale), width: Math.round((x1 - x0) * scale), height: Math.round((y1 - y0) * scale), differsPct: Math.round((changed / area) * 1000) / 10 });
    }
  }
  return regions.sort((left, right) => right.differsPct - left.differsPct);
}

const PANEL_WIDTH = 720;
const GAP = 8;

function blit(target: PNG, source: PNG, left: number): void {
  for (let y = 0; y < source.height; y += 1) source.data.copy(target.data, (y * target.width + left) * 4, y * source.width * 4, (y + 1) * source.width * 4);
}

function tinted(render: PNG, diff: PictureDiff): PNG {
  const out = new PNG({ width: render.width, height: render.height });
  for (let y = 0; y < render.height; y += 1) {
    const my = Math.min(diff.maskHeight - 1, Math.floor((y * diff.maskHeight) / render.height));
    for (let x = 0; x < render.width; x += 1) {
      const mx = Math.min(diff.maskWidth - 1, Math.floor((x * diff.maskWidth) / render.width));
      const i = (y * render.width + x) * 4;
      const red = isRed(diff.mask, my * diff.maskWidth + mx);
      for (let c = 0; c < 3; c += 1) out.data[i + c] = Math.round((render.data[i + c] ?? 0) * 0.35 + 255 * 0.65);
      if (red) {
        out.data[i] = 230;
        out.data[i + 1] = Math.round((out.data[i + 1] ?? 0) * 0.3);
        out.data[i + 2] = Math.round((out.data[i + 2] ?? 0) * 0.3);
      }
      out.data[i + 3] = 255;
    }
  }
  return out;
}

export function pictureSheet(reference: PNG, render: PNG, diff: PictureDiff): Buffer {
  const width = Math.min(PANEL_WIDTH, reference.width);
  const height = Math.max(1, Math.round((reference.height * width) / reference.width));
  const ref = resizePng(reference, width, height);
  const got = resizePng(render, width, height);
  const sheet = new PNG({ width: width * 3 + GAP * 2, height });
  sheet.data.fill(128);
  blit(sheet, ref, 0);
  blit(sheet, got, width + GAP);
  blit(sheet, tinted(got, diff), (width + GAP) * 2);
  return PNG.sync.write(sheet);
}
