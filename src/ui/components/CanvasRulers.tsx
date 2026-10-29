import { useEffect, useRef, type RefObject } from 'react';
import type { Rect } from '../snap';

export const RULER_SIZE = 20;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const MIN_LABEL_PX = 56;

interface View {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  artboardRef: RefObject<HTMLDivElement | null>;
  origin: { x: number; y: number };
  selection: Rect | null;
}

interface Colors {
  bg: string;
  tick: string;
  text: string;
  mark: string;
  markText: string;
  line: string;
}

function viewOf(el: HTMLElement | null): View | null {
  const m = el ? /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(el.style.transform) : null;
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]), zoom: Number(m[3]) || 1 };
}

function stepFor(zoom: number): number {
  return STEPS.find((s) => s * zoom >= MIN_LABEL_PX) ?? (STEPS.at(-1) as number);
}

function colorsOf(el: HTMLElement): Colors {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { bg: v('--ruler-bg'), tick: v('--ruler-tick'), text: v('--ruler-text'), mark: v('--ruler-mark'), markText: v('--ruler-mark-text'), line: v('--ruler-line') };
}

function sizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

interface AxisDraw {
  ctx: CanvasRenderingContext2D;
  length: number;
  offset: number;
  zoom: number;
  origin: number;
  vertical: boolean;
  colors: Colors;
  range: [number, number] | null;
}

function toScreen(a: AxisDraw, value: number): number {
  return a.offset + (value - a.origin) * a.zoom;
}

function tick(a: AxisDraw, pos: number, len: number): void {
  if (a.vertical) {
    a.ctx.moveTo(RULER_SIZE - len, pos + 0.5);
    a.ctx.lineTo(RULER_SIZE, pos + 0.5);
  } else {
    a.ctx.moveTo(pos + 0.5, RULER_SIZE - len);
    a.ctx.lineTo(pos + 0.5, RULER_SIZE);
  }
}

function markSpans(a: AxisDraw): [number, number][] {
  if (!a.range) return [];
  return a.range.map((value) => {
    const pos = toScreen(a, value);
    const half = (a.ctx.measureText(String(Math.round(value))).width + 6) / 2 + 2;
    return [pos - half, pos + half];
  });
}

function label(a: AxisDraw, pos: number, text: string, marks: [number, number][]): void {
  const { ctx } = a;
  const width = ctx.measureText(text).width;
  const [from, to] = a.vertical ? [pos - 3 - width, pos - 3] : [pos + 3, pos + 3 + width];
  if (marks.some(([lo, hi]) => from < hi && to > lo)) return;
  if (!a.vertical) {
    ctx.fillText(text, pos + 3, 9);
    return;
  }
  ctx.save();
  ctx.translate(9, pos - 3);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawRange(a: AxisDraw): void {
  if (!a.range) return;
  const [lo, hi] = a.range.map((v) => toScreen(a, v)) as [number, number];
  a.ctx.fillStyle = a.colors.mark;
  a.ctx.globalAlpha = 0.18;
  if (a.vertical) a.ctx.fillRect(0, lo, RULER_SIZE, hi - lo);
  else a.ctx.fillRect(lo, 0, hi - lo, RULER_SIZE);
  a.ctx.globalAlpha = 1;
  a.ctx.fillRect(a.vertical ? 0 : lo, a.vertical ? lo : 0, a.vertical ? RULER_SIZE : 1, a.vertical ? 1 : RULER_SIZE);
  a.ctx.fillRect(a.vertical ? 0 : hi - 1, a.vertical ? hi - 1 : 0, a.vertical ? RULER_SIZE : 1, a.vertical ? 1 : RULER_SIZE);
}

function drawRangeLabels(a: AxisDraw): void {
  if (!a.range) return;
  a.ctx.fillStyle = a.colors.mark;
  for (const value of a.range) {
    const pos = toScreen(a, value);
    const text = String(Math.round(value));
    const w = a.ctx.measureText(text).width + 6;
    if (a.vertical) a.ctx.fillRect(1, pos - w / 2, RULER_SIZE - 2, w);
    else a.ctx.fillRect(pos - w / 2, 1, w, RULER_SIZE - 2);
    a.ctx.fillStyle = a.colors.markText;
    a.ctx.save();
    a.ctx.textAlign = 'center';
    a.ctx.textBaseline = 'middle';
    a.ctx.translate(a.vertical ? RULER_SIZE / 2 : pos, a.vertical ? pos : RULER_SIZE / 2);
    if (a.vertical) a.ctx.rotate(-Math.PI / 2);
    a.ctx.fillText(text, 0, 0);
    a.ctx.restore();
    a.ctx.fillStyle = a.colors.mark;
  }
}

function drawAxis(a: AxisDraw): void {
  const { ctx } = a;
  ctx.fillStyle = a.colors.bg;
  ctx.fillRect(0, 0, a.vertical ? RULER_SIZE : a.length, a.vertical ? a.length : RULER_SIZE);
  drawRange(a);
  const step = stepFor(a.zoom);
  const minor = step / 5;
  const first = Math.floor((a.origin + (0 - a.offset) / a.zoom) / step) * step;
  const last = a.origin + (a.length - a.offset) / a.zoom;
  ctx.strokeStyle = a.colors.tick;
  ctx.fillStyle = a.colors.text;
  ctx.lineWidth = 1;
  const marks = markSpans(a);
  ctx.beginPath();
  for (let v = first; v <= last; v += step) {
    const pos = Math.round(toScreen(a, v));
    tick(a, pos, RULER_SIZE);
    label(a, pos, String(Math.round(v)), marks);
    for (let i = 1; i < 5; i += 1) tick(a, Math.round(toScreen(a, v + minor * i)), 4);
  }
  ctx.stroke();
  ctx.fillStyle = a.colors.line;
  if (a.vertical) ctx.fillRect(RULER_SIZE - 1, 0, 1, a.length);
  else ctx.fillRect(0, RULER_SIZE - 1, a.length, 1);
  drawRangeLabels(a);
}

export default function CanvasRulers({ artboardRef, origin, selection }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);
  const props = useRef({ origin, selection });
  props.current = { origin, selection };
  const draw = useRef<() => void>(() => undefined);
  draw.current = () => {
    const view = viewOf(artboardRef.current);
    const el = root.current;
    if (!view || !el || !top.current || !left.current) return;
    const colors = colorsOf(el);
    const { origin: o, selection: s } = props.current;
    const font = `500 9px ${getComputedStyle(el).fontFamily}`;
    const run = (canvas: HTMLCanvasElement, vertical: boolean) => {
      const ctx = sizeCanvas(canvas);
      if (!ctx) return;
      ctx.font = font;
      const range: [number, number] | null = s ? (vertical ? [o.y + s.y, o.y + s.y + s.height] : [o.x + s.x, o.x + s.x + s.width]) : null;
      const length = vertical ? canvas.clientHeight : canvas.clientWidth;
      drawAxis({ ctx, length, offset: (vertical ? view.y : view.x) - RULER_SIZE, zoom: view.zoom, origin: vertical ? o.y : o.x, vertical, colors, range });
    };
    run(top.current, false);
    run(left.current, true);
  };

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw.current();
      });
    };
    const board = artboardRef.current;
    const mo = new MutationObserver(schedule);
    if (board) mo.observe(board, { attributes: true, attributeFilter: ['style'] });
    const ro = new ResizeObserver(schedule);
    if (root.current) ro.observe(root.current);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', schedule);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      ro.disconnect();
      theme.disconnect();
      media.removeEventListener('change', schedule);
    };
  }, [artboardRef]);

  useEffect(() => draw.current(), [origin.x, origin.y, selection?.x, selection?.y, selection?.width, selection?.height]);

  return (
    <div ref={root} className="canvas-rulers" data-testid="canvas-rulers" aria-hidden="true">
      <canvas ref={top} className="canvas-ruler top" />
      <canvas ref={left} className="canvas-ruler left" />
      <div className="canvas-ruler-corner" />
    </div>
  );
}
