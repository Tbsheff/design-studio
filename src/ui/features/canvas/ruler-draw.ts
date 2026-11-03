import type { RefObject } from "react";

import type { Rect } from "./snap-model.js";

export const RULER_SIZE = 20;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000];
const MIN_LABEL_PX = 56;

interface View {
  x: number;
  y: number;
  zoom: number;
}

export interface Props {
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

export function viewOf(el: HTMLElement | null): View | null {
  const m = el
    ? /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(
        el.style.transform
      )
    : null;

  if (!m) {
    return null;
  }

  return { x: Number(m[1]), y: Number(m[2]), zoom: Number(m[3]) || 1 };
}

function stepFor(zoom: number): number {
  return (
    STEPS.find((s) => s * zoom >= MIN_LABEL_PX) ?? (STEPS.at(-1) as number)
  );
}

export function colorsOf(el: HTMLElement): Colors {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();

  return {
    bg: v("--ruler-bg"),
    tick: v("--ruler-tick"),
    text: v("--ruler-text"),
    mark: v("--ruler-mark"),
    markText: v("--ruler-mark-text"),
    line: v("--ruler-line"),
  };
}

export function sizeCanvas(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  const ctx = canvas.getContext("2d");
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
  if (!a.range) {
    return [];
  }

  return a.range.map((value) => {
    const pos = toScreen(a, value);

    const half =
      (a.ctx.measureText(String(Math.round(value))).width + 6) / 2 + 2;

    return [pos - half, pos + half];
  });
}

function label(
  a: AxisDraw,
  pos: number,
  text: string,
  marks: [number, number][]
): void {
  const { ctx } = a;
  const width = ctx.measureText(text).width;

  const [from, to] = a.vertical
    ? [pos - 3 - width, pos - 3]
    : [pos + 3, pos + 3 + width];

  if (marks.some(([lo, hi]) => from < hi && to > lo)) {
    return;
  }

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
  if (!a.range) {
    return;
  }

  const [lo, hi] = a.range.map((v) => toScreen(a, v)) as [number, number];
  a.ctx.fillStyle = a.colors.mark;
  a.ctx.globalAlpha = 0.18;

  if (a.vertical) {
    a.ctx.fillRect(0, lo, RULER_SIZE, hi - lo);
  } else {
    a.ctx.fillRect(lo, 0, hi - lo, RULER_SIZE);
  }

  a.ctx.globalAlpha = 1;
  a.ctx.fillRect(
    a.vertical ? 0 : lo,
    a.vertical ? lo : 0,
    a.vertical ? RULER_SIZE : 1,
    a.vertical ? 1 : RULER_SIZE
  );
  a.ctx.fillRect(
    a.vertical ? 0 : hi - 1,
    a.vertical ? hi - 1 : 0,
    a.vertical ? RULER_SIZE : 1,
    a.vertical ? 1 : RULER_SIZE
  );
}

function drawRangeLabels(a: AxisDraw): void {
  if (!a.range) {
    return;
  }

  a.ctx.fillStyle = a.colors.mark;

  for (const value of a.range) {
    const pos = toScreen(a, value);
    const text = String(Math.round(value));
    const w = a.ctx.measureText(text).width + 6;

    if (a.vertical) {
      a.ctx.fillRect(1, pos - w / 2, RULER_SIZE - 2, w);
    } else {
      a.ctx.fillRect(pos - w / 2, 1, w, RULER_SIZE - 2);
    }

    a.ctx.fillStyle = a.colors.markText;
    a.ctx.save();
    a.ctx.textAlign = "center";
    a.ctx.textBaseline = "middle";
    a.ctx.translate(
      a.vertical ? RULER_SIZE / 2 : pos,
      a.vertical ? pos : RULER_SIZE / 2
    );

    if (a.vertical) {
      a.ctx.rotate(-Math.PI / 2);
    }

    a.ctx.fillText(text, 0, 0);
    a.ctx.restore();
    a.ctx.fillStyle = a.colors.mark;
  }
}

export function drawAxis(a: AxisDraw): void {
  const { ctx } = a;
  ctx.fillStyle = a.colors.bg;
  ctx.fillRect(
    0,
    0,
    a.vertical ? RULER_SIZE : a.length,
    a.vertical ? a.length : RULER_SIZE
  );
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

    for (let i = 1; i < 5; i += 1) {
      tick(a, Math.round(toScreen(a, v + minor * i)), 4);
    }
  }

  ctx.stroke();
  ctx.fillStyle = a.colors.line;

  if (a.vertical) {
    ctx.fillRect(RULER_SIZE - 1, 0, 1, a.length);
  } else {
    ctx.fillRect(0, RULER_SIZE - 1, a.length, 1);
  }

  drawRangeLabels(a);
}
