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
