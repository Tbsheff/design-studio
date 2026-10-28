import type PptxGenJS from 'pptxgenjs';
import type { ScanClip, ScanLine, ScanText } from './page-scan.js';
import type { VectorRegion } from './vector.js';

type Slide = ReturnType<PptxGenJS['addSlide']>;
type TextRun = { text: string; options: PptxGenJS.TextPropsOptions };

const PX_PER_IN = 96;
const PT_PER_PX = 0.75;
const MAX_SIDE_IN = 56;
const GENERIC = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', '-apple-system', 'blinkmacsystemfont', 'emoji', 'math', 'fangsong']);

export function fontFace(family: string): string {
  const names = family.split(',').map((name) => name.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const head = (names[0] ?? 'sans-serif').toLowerCase();
  if (!GENERIC.has(head)) return names[0] ?? 'Helvetica Neue';
  if (head.includes('mono')) return 'Menlo';
  if (head.includes('serif') && !head.includes('sans')) return 'Georgia';
  return 'Helvetica Neue';
}

interface Segment {
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
  const options: PptxGenJS.TextPropsOptions = {
    fontFace: fontFace(font.family),
    fontSize: Math.round(font.size * PT_PER_PX * k * 100) / 100,
    color: color.hex.toUpperCase(),
    bold: font.weight >= 600,
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

function addBlock(slide: Slide, segments: Segment[], k: number): void {
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
  const slack = Math.max(8, width * 0.08);
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

function addTexts(slide: Slide, region: VectorRegion, k: number): number {
  const blocks = new Map<number, Segment[]>();
  for (const item of region.scan.items) {
    if (item.kind !== 'text') continue;
    const clip = item.clip >= 0 ? region.scan.clips[item.clip] : undefined;
    const list = blocks.get(item.block) ?? [];
    for (const line of item.lines) if (visible(line, clip)) list.push({ text: item, line });
    blocks.set(item.block, list);
  }
  let count = 0;
  for (const segments of blocks.values()) {
    if (segments.length === 0) continue;
    addBlock(slide, segments, k);
    count += 1;
  }
  return count;
}

export interface PptxResult {
  bytes: Buffer;
  slides: number;
  textBoxes: number;
}

export async function buildPptx(regions: VectorRegion[], title: string): Promise<PptxResult> {
  const { default: Pptx } = await import('pptxgenjs');
  const pptx = new Pptx();
  const [first] = regions;
  if (!first) throw new Error('nothing to export');
  const fit = Math.min(1, MAX_SIDE_IN / Math.max(first.scan.width / PX_PER_IN, first.scan.height / PX_PER_IN));
  const width = (first.scan.width / PX_PER_IN) * fit;
  const height = (first.scan.height / PX_PER_IN) * fit;
  pptx.defineLayout({ name: 'STUDIO', width, height });
  pptx.layout = 'STUDIO';
  pptx.title = title;
  pptx.company = 'Design Studio';
  let textBoxes = 0;
  for (const region of regions) {
    const slide = pptx.addSlide();
    const k = (width * PX_PER_IN) / region.scan.width;
    const imageHeight = (region.scan.height * k) / PX_PER_IN;
    const data = `image/png;base64,${region.png.toString('base64')}`;
    if (region.scan.background) slide.background = { color: region.scan.background.hex.toUpperCase() };
    if (Math.abs(imageHeight - height) / height < 0.01) slide.background = { data };
    else slide.addImage({ data, x: 0, y: 0, w: width, h: imageHeight });
    textBoxes += addTexts(slide, region, k);
  }
  const bytes = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return { bytes, slides: regions.length, textBoxes };
}
