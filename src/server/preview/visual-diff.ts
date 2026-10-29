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
const EDGE_WIDTH = 320;
const EDGE_TOLERANCE = 2;
const EDGE_THRESHOLD = 96;
const BACKGROUND_TOLERANCE = 18;
const CONTENT_WIDTH = 160;
const CONTENT_THRESHOLD = 0.15;
const EDGE_POWER = 2;
const CONTENT_WEIGHT = 0.2;
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
  contentDiffersPct: number;
  edgeMatchPct: number;
}

export interface PictureDiff {
  differsPct: number;
  contentScore: number;
  edgeScore: number;
  score: number;
  regions: PictureRegion[];
  mask: Buffer;
  maskWidth: number;
  maskHeight: number;
}

interface Plane {
  width: number;
  height: number;
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface EdgeMatch extends Plane {
  edgesA: Uint8Array;
  edgesB: Uint8Array;
  missA: Uint8Array;
  missB: Uint8Array;
}

interface ContentMap extends Plane {
  cells: Uint8Array;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isRed(mask: Buffer, index: number): boolean {
  return mask[index * 4] === 255 && mask[index * 4 + 1] === 0;
}

function backgroundOf(png: PNG): [number, number, number] {
  const bins = new Uint32Array(4096);
  for (let i = 0; i < png.data.length; i += 4) {
    const bin = ((png.data[i] ?? 0) >> 4) * 256 + ((png.data[i + 1] ?? 0) >> 4) * 16 + ((png.data[i + 2] ?? 0) >> 4);
    bins[bin] = (bins[bin] ?? 0) + 1;
  }
  let best = 0;
  for (let bin = 1; bin < bins.length; bin += 1) if ((bins[bin] ?? 0) > (bins[best] ?? 0)) best = bin;
  return [((best >> 8) << 4) + 8, (((best >> 4) & 15) << 4) + 8, ((best & 15) << 4) + 8];
}

function colorGap(png: PNG, at: number, color: readonly number[]): number {
  return Math.max(Math.abs((png.data[at] ?? 0) - (color[0] ?? 0)), Math.abs((png.data[at + 1] ?? 0) - (color[1] ?? 0)), Math.abs((png.data[at + 2] ?? 0) - (color[2] ?? 0)));
}

function markContent(png: PNG, background: readonly number[], into: Uint8Array): void {
  for (let p = 0; p < into.length; p += 1) if (colorGap(png, p * 4, background) > BACKGROUND_TOLERANCE) into[p] = 1;
}

function contentDiff(a: PNG, b: PNG): ContentMap {
  const mask = Buffer.alloc(a.width * a.height * 4);
  pixelmatch(a.data, b.data, mask, a.width, a.height, { threshold: CONTENT_THRESHOLD, diffMask: true, diffColor: [255, 0, 0], diffColorAlt: [255, 0, 0] });
  const content = new Uint8Array(a.width * a.height);
  const backA = backgroundOf(a);
  const backB = backgroundOf(b);
  if (Math.max(...backA.map((value, index) => Math.abs(value - (backB[index] ?? 0)))) > BACKGROUND_TOLERANCE) content.fill(1);
  markContent(a, backA, content);
  markContent(b, backB, content);
  for (let p = 0; p < content.length; p += 1) if (content[p] && isRed(mask, p)) content[p] = 2;
  return { width: a.width, height: a.height, cells: content };
}

function contentDiffersPct(content: ContentMap, box: Box = { x0: 0, x1: content.width, y0: 0, y1: content.height }): number {
  let union = 0;
  let differs = 0;
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      const value = content.cells[y * content.width + x] ?? 0;
      if (value > 0) union += 1;
      if (value === 2) differs += 1;
    }
  }
  return union === 0 ? 0 : (differs / union) * 100;
}

function luminance(png: PNG): Float32Array {
  const out = new Float32Array(png.width * png.height);
  for (let p = 0; p < out.length; p += 1) out[p] = 0.299 * (png.data[p * 4] ?? 0) + 0.587 * (png.data[p * 4 + 1] ?? 0) + 0.114 * (png.data[p * 4 + 2] ?? 0);
  return out;
}

function sobelAt(lum: Float32Array, width: number, at: number): number {
  const tl = lum[at - width - 1] ?? 0;
  const tr = lum[at - width + 1] ?? 0;
  const bl = lum[at + width - 1] ?? 0;
  const br = lum[at + width + 1] ?? 0;
  const gx = tr + 2 * (lum[at + 1] ?? 0) + br - tl - 2 * (lum[at - 1] ?? 0) - bl;
  const gy = bl + 2 * (lum[at + width] ?? 0) + br - tl - 2 * (lum[at - width] ?? 0) - tr;
  return Math.hypot(gx, gy);
}

function edgesOf(png: PNG): Uint8Array {
  const lum = luminance(png);
  const out = new Uint8Array(png.width * png.height);
  for (let y = 1; y < png.height - 1; y += 1) {
    for (let x = 1; x < png.width - 1; x += 1) if (sobelAt(lum, png.width, y * png.width + x) > EDGE_THRESHOLD) out[y * png.width + x] = 1;
  }
  return out;
}

function spreadRows(src: Uint8Array, plane: Plane, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < plane.height; y += 1) {
    for (let x = 0; x < plane.width; x += 1) {
      if (src[y * plane.width + x]) out.fill(1, y * plane.width + Math.max(0, x - radius), y * plane.width + Math.min(plane.width, x + radius + 1));
    }
  }
  return out;
}

function spreadColumns(src: Uint8Array, plane: Plane, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < plane.height; y += 1) {
    const from = Math.max(0, y - radius) * plane.width;
    const to = Math.min(plane.height - 1, y + radius) * plane.width;
    for (let x = 0; x < plane.width; x += 1) {
      if (src[y * plane.width + x]) for (let at = from + x; at <= to + x; at += plane.width) out[at] = 1;
    }
  }
  return out;
}

function nearOf(edges: Uint8Array, plane: Plane): Uint8Array {
  return spreadColumns(spreadRows(edges, plane, EDGE_TOLERANCE), plane, EDGE_TOLERANCE);
}

function missesOf(edges: Uint8Array, near: Uint8Array): Uint8Array {
  const out = new Uint8Array(edges.length);
  for (let p = 0; p < edges.length; p += 1) if (edges[p] && !near[p]) out[p] = 1;
  return out;
}

function sumOf(values: Uint8Array, plane: Plane, box: Box = { x0: 0, x1: plane.width, y0: 0, y1: plane.height }): number {
  let total = 0;
  for (let y = box.y0; y < box.y1; y += 1) for (let x = box.x0; x < box.x1; x += 1) total += values[y * plane.width + x] ?? 0;
  return total;
}

function matchEdges(reference: PNG, render: PNG): EdgeMatch {
  const plane = { width: reference.width, height: reference.height };
  const edgesA = edgesOf(reference);
  const edgesB = edgesOf(render);
  return { ...plane, edgesA, edgesB, missA: missesOf(edgesA, nearOf(edgesB, plane)), missB: missesOf(edgesB, nearOf(edgesA, plane)) };
}

function edgeScoreOf(match: EdgeMatch, box: Box = { x0: 0, x1: match.width, y0: 0, y1: match.height }): number {
  const totalA = sumOf(match.edgesA, match, box);
  const totalB = sumOf(match.edgesB, match, box);
  if (totalA + totalB === 0) return 100;
  const recall = totalA === 0 ? 0 : 1 - sumOf(match.missA, match, box) / totalA;
  const precision = totalB === 0 ? 0 : 1 - sumOf(match.missB, match, box) / totalB;
  return precision + recall === 0 ? 0 : 100 * ((2 * precision * recall) / (precision + recall)) ** EDGE_POWER;
}

function scaledTo(png: PNG, width: number, ratio: PNG): PNG {
  const height = Math.max(1, Math.round((ratio.height * width) / ratio.width));
  return png.width === width && png.height === height ? png : resizePng(png, width, height);
}

function blend(contentScore: number, edgeScore: number): number {
  return CONTENT_WEIGHT * contentScore + (1 - CONTENT_WEIGHT) * edgeScore;
}

export function diffPictures(reference: PNG, render: PNG): PictureDiff {
  const a = scaledTo(reference, Math.min(COMPARE_WIDTH, reference.width), reference);
  const b = scaledTo(render, a.width, reference);
  const { width, height } = a;
  const mask = Buffer.alloc(width * height * 4);
  const changed = pixelmatch(a.data, b.data, mask, width, height, { threshold: 0.15, diffMask: true, diffColor: [255, 0, 0], diffColorAlt: [255, 0, 0] });
  const contentWidth = Math.min(CONTENT_WIDTH, reference.width);
  const content = contentDiff(scaledTo(reference, contentWidth, reference), scaledTo(render, contentWidth, reference));
  const edgeWidth = Math.min(EDGE_WIDTH, reference.width);
  const edges = matchEdges(scaledTo(reference, edgeWidth, reference), scaledTo(render, edgeWidth, reference));
  const contentScore = 100 - contentDiffersPct(content);
  const edgeScore = edgeScoreOf(edges);
  const regions = gridRegions({ mask, width, height }, content, edges).map((region) => scaleRegion(region, reference.width / width));
  return { differsPct: round1((changed / (width * height)) * 100), contentScore: round1(contentScore), edgeScore: round1(edgeScore), score: Math.round(blend(contentScore, edgeScore)), regions, mask, maskWidth: width, maskHeight: height };
}

function cellBox(plane: Plane, row: number, col: number): Box {
  return { x0: Math.floor((col * plane.width) / GRID), x1: Math.floor(((col + 1) * plane.width) / GRID), y0: Math.floor((row * plane.height) / GRID), y1: Math.floor(((row + 1) * plane.height) / GRID) };
}

function changedPct(grid: Plane & { mask: Buffer }, box: Box): number {
  let changed = 0;
  for (let y = box.y0; y < box.y1; y += 1) for (let x = box.x0; x < box.x1; x += 1) if (isRed(grid.mask, y * grid.width + x)) changed += 1;
  return round1((changed / Math.max(1, (box.x1 - box.x0) * (box.y1 - box.y0))) * 100);
}

function scaleRegion(region: PictureRegion, scale: number): PictureRegion {
  return { ...region, x: Math.round(region.x * scale), y: Math.round(region.y * scale), width: Math.round(region.width * scale), height: Math.round(region.height * scale) };
}

function gridRegions(grid: Plane & { mask: Buffer }, content: ContentMap, edges: EdgeMatch): PictureRegion[] {
  const regions: (PictureRegion & { weight: number })[] = [];
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      const box = cellBox(grid, row, col);
      const contentPct = contentDiffersPct(content, cellBox(content, row, col));
      const edgePct = edgeScoreOf(edges, cellBox(edges, row, col));
      regions.push({ name: `${ROW_NAMES[row]} ${COL_NAMES[col]}`, x: box.x0, y: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0, differsPct: changedPct(grid, box), contentDiffersPct: round1(contentPct), edgeMatchPct: round1(edgePct), weight: blend(100 - contentPct, edgePct) });
    }
  }
  return regions.sort((left, right) => left.weight - right.weight).map(({ weight: _weight, ...region }) => region);
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
