import type { MeasureResult } from './arrange.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasureLine {
  axis: 'x' | 'y';
  from: number;
  to: number;
  at: number;
  value: number;
}

function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

function line(axis: 'x' | 'y', a: number, b: number, at: number): MeasureLine | null {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return to - from > 0.01 ? { axis, from, to, at, value: to - from } : null;
}

function insideLines(outer: Rect, inner: Rect): MeasureLine[] {
  const midX = inner.x + inner.width / 2;
  const midY = inner.y + inner.height / 2;
  return [
    line('y', outer.y, inner.y, midX),
    line('y', inner.y + inner.height, outer.y + outer.height, midX),
    line('x', outer.x, inner.x, midY),
    line('x', inner.x + inner.width, outer.x + outer.width, midY),
  ].filter((l): l is MeasureLine => l !== null);
}

function overlapMid(a0: number, a1: number, b0: number, b1: number): number {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return lo <= hi ? (lo + hi) / 2 : (a0 + a1) / 2;
}

export function measureBetween(selected: Rect, other: Rect): MeasureLine[] {
  if (contains(other, selected)) return insideLines(other, selected);
  if (contains(selected, other)) return insideLines(selected, other);
  const out: MeasureLine[] = [];
  const sRight = selected.x + selected.width;
  const oRight = other.x + other.width;
  const sBottom = selected.y + selected.height;
  const oBottom = other.y + other.height;
  const midY = overlapMid(selected.y, sBottom, other.y, oBottom);
  const midX = overlapMid(selected.x, sRight, other.x, oRight);
  if (oRight <= selected.x) out.push(line('x', oRight, selected.x, midY) as MeasureLine);
  else if (other.x >= sRight) out.push(line('x', sRight, other.x, midY) as MeasureLine);
  if (oBottom <= selected.y) out.push(line('y', oBottom, selected.y, midX) as MeasureLine);
  else if (other.y >= sBottom) out.push(line('y', sBottom, other.y, midX) as MeasureLine);
  return out.filter((l) => l !== null);
}

export function formatMeasure(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function axisGap(a0: number, a1: number, b0: number, b1: number): number | null {
  if (b0 >= a1) return b0 - a1;
  if (a0 >= b1) return a0 - b1;
  return null;
}

function relationOf(a: Rect, b: Rect, gap: MeasureResult['gap']): MeasureResult['relation'] {
  if (contains(b, a)) return 'a-inside-b';
  if (contains(a, b)) return 'b-inside-a';
  return gap.horizontal === null && gap.vertical === null ? 'overlap' : 'apart';
}

function insideOf(outer: Rect, inner: Rect): NonNullable<MeasureResult['inside']> {
  return { top: inner.y - outer.y, right: outer.x + outer.width - (inner.x + inner.width), bottom: outer.y + outer.height - (inner.y + inner.height), left: inner.x - outer.x };
}

export function measureRects(a: Rect, b: Rect): MeasureResult {
  const gap = { horizontal: axisGap(a.x, a.x + a.width, b.x, b.x + b.width), vertical: axisGap(a.y, a.y + a.height, b.y, b.y + b.height) };
  const relation = relationOf(a, b, gap);
  const inside = relation === 'a-inside-b' ? insideOf(b, a) : relation === 'b-inside-a' ? insideOf(a, b) : null;
  const centers = { dx: b.x + b.width / 2 - (a.x + a.width / 2), dy: b.y + b.height / 2 - (a.y + a.height / 2) };
  return { a, b, relation, gap, inside, centers, lines: measureBetween(a, b) };
}
