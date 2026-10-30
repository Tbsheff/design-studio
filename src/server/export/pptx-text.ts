import type PptxGenJS from 'pptxgenjs';
import type { ScanClip, ScanLine, ScanResult, ScanText } from './page-scan.js';

export type Slide = ReturnType<PptxGenJS['addSlide']>;
type TextRun = { text: string; options: PptxGenJS.TextPropsOptions };

const PX_PER_IN = 96;
const PT_PER_PX = 0.75;
const GAP_EM = 0.6;
const GENERIC = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', '-apple-system', 'blinkmacsystemfont', 'emoji', 'math', 'fangsong']);
const FACES: Record<string, Record<number, { face: string; bold: boolean }>> = {
  'Helvetica Neue': { 100: { face: 'UltraLight', bold: false }, 200: { face: 'Thin', bold: false }, 300: { face: 'Light', bold: false }, 500: { face: 'Medium', bold: false } },
  'Avenir Next': { 100: { face: 'Ultra Light', bold: false }, 200: { face: 'Ultra Light', bold: false }, 500: { face: 'Medium', bold: false }, 600: { face: 'Demi Bold', bold: false }, 800: { face: 'Heavy', bold: false }, 900: { face: 'Heavy', bold: false } },
};

export function fontFace(family: string): string {
  const names = family.split(',').map((name) => name.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const head = (names[0] ?? 'sans-serif').toLowerCase();
  if (!GENERIC.has(head)) return names[0] ?? 'Helvetica Neue';
  if (head.includes('mono')) return 'Menlo';
  if (head === 'ui-serif') return 'New York';
  if (head.includes('serif') && !head.includes('sans')) return 'Georgia';
  return 'Helvetica Neue';
}

function weighted(family: string, weight: number): { face: string; bold: boolean } {
  const face = fontFace(family);
  const named = FACES[face]?.[Math.round(weight / 100) * 100];
  return named ? { face: `${face} ${named.face}`, bold: named.bold } : { face, bold: weight >= 600 };
}

export interface Segment {
  text: ScanText;
  line: ScanLine;
}

function rowsOf(segments: Segment[]): Segment[][] {
  const rows: Segment[][] = [];
  const sorted = [...segments].sort((a, b) => a.line.baseline - b.line.baseline);
  for (const segment of sorted) {
    const row = rows.find((r) => Math.abs((r[0]?.line.baseline ?? 0) - segment.line.baseline) < segment.text.font.size * 0.5);
    if (row) row.push(segment);
    else rows.push([segment]);
  }
  for (const row of rows) row.sort((a, b) => a.line.x - b.line.x);
  return rows;
}

function visible(line: ScanLine, clip: ScanClip | undefined): boolean {
  if (!clip) return true;
  return line.x < clip.x + clip.width && line.x + line.width > clip.x && line.y < clip.y + clip.height && line.y + line.height > clip.y;
}

function runFor(segment: Segment, text: string, k: number, breakLine: boolean): TextRun {
  const { font, color } = segment.text;
  const alpha = color.alpha * segment.text.opacity;
  const face = weighted(font.family, font.weight);
  const options: PptxGenJS.TextPropsOptions = {
    fontFace: face.face,
    fontSize: Math.round(font.size * PT_PER_PX * k * 100) / 100,
    color: color.hex.toUpperCase(),
    bold: face.bold,
    italic: font.italic,
    breakLine,
  };
  if (segment.text.letterSpacing) options.charSpacing = Math.round(segment.text.letterSpacing * PT_PER_PX * k * 100) / 100;
  if (alpha < 0.99) options.transparency = Math.round((1 - alpha) * 100);
  if (segment.text.underline) options.underline = { style: 'sng' };
  if (segment.text.strike) options.strike = 'sngStrike';
  return { text, options };
}

function runsOf(rows: Segment[][], k: number): TextRun[] {
  const runs: TextRun[] = [];
  rows.forEach((row, rowIndex) => {
    row.forEach((segment, index) => {
      const prev = row[index - 1];
      const gap = prev ? segment.line.x - (prev.line.x + prev.line.width) : 0;
      const text = `${gap > 1 ? ' ' : ''}${segment.line.text}`;
      runs.push(runFor(segment, text, k, index === row.length - 1 && rowIndex < rows.length - 1));
    });
  });
  return runs;
}

function alignOf(align: string): 'left' | 'center' | 'right' {
  if (align === 'center') return 'center';
  if (align === 'right' || align === 'end') return 'right';
  return 'left';
}

export function addBlock(slide: Slide, segments: Segment[], k: number): void {
  const rows = rowsOf(segments);
  const first = rows[0]?.[0];
  if (!first) return;
  const all = rows.flat();
  const left = Math.min(...all.map((s) => s.line.x));
  const right = Math.max(...all.map((s) => s.line.x + s.line.width));
  const baselines = rows.map((row) => row[0]?.line.baseline ?? 0);
  const pitch = rows.length > 1 ? ((baselines[baselines.length - 1] ?? 0) - (baselines[0] ?? 0)) / (rows.length - 1) : first.text.lineHeight;
  const top = first.line.y - Math.max(0, pitch - first.line.height) / 2;
  const align = alignOf(first.text.align);
  const width = right - left;
  const slack = Math.max(8, width * 0.12);
  const x = align === 'left' ? left : align === 'center' ? left - slack / 2 : left - slack;
  const toIn = (value: number): number => (value * k) / PX_PER_IN;
  slide.addText(runsOf(rows, k), {
    x: toIn(x),
    y: toIn(top),
    w: toIn(width + slack),
    h: toIn(pitch * rows.length),
    margin: 0,
    valign: 'top',
    align,
    fit: 'none',
    wrap: false,
    lineSpacing: Math.round(pitch * PT_PER_PX * k * 100) / 100,
    isTextBox: true,
  });
}

function splitAtGaps(segments: Segment[]): Segment[][] {
  const rows = rowsOf(segments);
  const [row] = rows;
  if (rows.length !== 1 || !row) return [segments];
  const groups: Segment[][] = [];
  row.forEach((segment, index) => {
    const prev = row[index - 1];
    const gap = prev ? segment.line.x - (prev.line.x + prev.line.width) : 0;
    const last = groups[groups.length - 1];
    if (last && gap <= segment.text.font.size * GAP_EM) last.push(segment);
    else groups.push([segment]);
  });
  return groups;
}

export interface TextBlock {
  z: number;
  segments: Segment[];
}

export function textBlocks(scan: ScanResult): TextBlock[] {
  const blocks = new Map<number, TextBlock>();
  scan.items.forEach((item, z) => {
    if (item.kind !== 'text') return;
    const clip = item.clip >= 0 ? scan.clips[item.clip] : undefined;
    const block = blocks.get(item.block) ?? { z, segments: [] };
    for (const line of item.lines) if (visible(line, clip)) block.segments.push({ text: item, line });
    blocks.set(item.block, block);
  });
  return [...blocks.values()].filter((block) => block.segments.length > 0).flatMap((block) => splitAtGaps(block.segments).map((segments) => ({ z: block.z, segments })));
}
