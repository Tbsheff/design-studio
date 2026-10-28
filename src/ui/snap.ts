export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Axis = 'x' | 'y';
export type SnapKind = 'move' | 'end' | null;

export interface SnapGuide {
  axis: Axis;
  at: number;
  from: number;
  to: number;
}

export interface SpacingBadge {
  axis: Axis;
  from: number;
  to: number;
  at: number;
  value: number;
}

export interface SnapResult {
  rect: Rect;
  guides: SnapGuide[];
  spacing: SpacingBadge[];
}

export interface SnapInput {
  rect: Rect;
  candidates: Rect[];
  zoom: number;
  x: SnapKind;
  y: SnapKind;
}

export const SNAP_PX = 6;
const SAME = 0.5;

interface Span {
  lo: number;
  hi: number;
}

function span(r: Rect, axis: Axis): Span {
  return axis === 'x' ? { lo: r.x, hi: r.x + r.width } : { lo: r.y, hi: r.y + r.height };
}

function cross(axis: Axis): Axis {
  return axis === 'x' ? 'y' : 'x';
}

function linesOf(s: Span): number[] {
  return [s.lo, (s.lo + s.hi) / 2, s.hi];
}

function overlaps(a: Span, b: Span): boolean {
  return Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > 0;
}

function movingPoints(s: Span, kind: Exclude<SnapKind, null>): number[] {
  return kind === 'move' ? linesOf(s) : [s.hi];
}

function nearest(deltas: number[], threshold: number): number | null {
  let best: number | null = null;
  for (const d of deltas) if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
  return best;
}

function edgeDeltas(own: Span, kind: Exclude<SnapKind, null>, candidates: Rect[], axis: Axis): number[] {
  const points = movingPoints(own, kind);
  const out: number[] = [];
  for (const c of candidates) for (const t of linesOf(span(c, axis))) for (const p of points) out.push(t - p);
  return out;
}

interface Neighbours {
  before: Span | null;
  after: Span | null;
  gaps: { a: Span; b: Span; at: number }[];
}

function crossMid(a: Rect, b: Rect, axis: Axis): number {
  const c = cross(axis);
  const sa = span(a, c);
  const sb = span(b, c);
  return (Math.max(sa.lo, sb.lo) + Math.min(sa.hi, sb.hi)) / 2;
}

function existingGaps(candidates: Rect[], axis: Axis): Neighbours['gaps'] {
  const c = cross(axis);
  const gaps: Neighbours['gaps'] = [];
  for (const a of candidates) {
    const sa = span(a, axis);
    let next: Rect | null = null;
    for (const b of candidates) {
      const sb = span(b, axis);
      if (b === a || sb.lo < sa.hi || !overlaps(span(a, c), span(b, c))) continue;
      if (!next || sb.lo < span(next, axis).lo) next = b;
    }
    if (next && span(next, axis).lo - sa.hi > 0) gaps.push({ a: sa, b: span(next, axis), at: crossMid(a, next, axis) });
  }
  return gaps;
}

function neighboursOf(rect: Rect, candidates: Rect[], axis: Axis): Neighbours {
  const own = span(rect, axis);
  const c = cross(axis);
  let before: Span | null = null;
  let after: Span | null = null;
  for (const cand of candidates) {
    if (!overlaps(span(rect, c), span(cand, c))) continue;
    const s = span(cand, axis);
    if (s.hi <= own.lo && (!before || s.hi > before.hi)) before = s;
    if (s.lo >= own.hi && (!after || s.lo < after.lo)) after = s;
  }
  return { before, after, gaps: existingGaps(candidates, axis) };
}

function spacingDeltas(own: Span, n: Neighbours): number[] {
  const out: number[] = [];
  for (const g of n.gaps) {
    const value = g.b.lo - g.a.hi;
    if (n.before) out.push(n.before.hi + value - own.lo);
    if (n.after) out.push(n.after.lo - value - own.hi);
  }
  if (n.before && n.after) out.push((n.before.hi + n.after.lo - (own.hi - own.lo)) / 2 - own.lo);
  return out;
}

function axisDelta(input: SnapInput, axis: Axis, threshold: number): number {
  const kind = input[axis];
  if (!kind) return 0;
  const own = span(input.rect, axis);
  const deltas = edgeDeltas(own, kind, input.candidates, axis);
  if (kind === 'move') deltas.push(...spacingDeltas(own, neighboursOf(input.rect, input.candidates, axis)));
  return nearest(deltas, threshold) ?? 0;
}

function shifted(rect: Rect, axis: Axis, kind: SnapKind, delta: number): Rect {
  if (!kind || delta === 0) return rect;
  if (kind === 'move') return axis === 'x' ? { ...rect, x: rect.x + delta } : { ...rect, y: rect.y + delta };
  return axis === 'x' ? { ...rect, width: Math.max(1, rect.width + delta) } : { ...rect, height: Math.max(1, rect.height + delta) };
}

function guidesFor(rect: Rect, candidates: Rect[], axis: Axis, kind: Exclude<SnapKind, null>): SnapGuide[] {
  const points = movingPoints(span(rect, axis), kind);
  const c = cross(axis);
  const own = span(rect, c);
  const byAt = new Map<number, SnapGuide>();
  for (const cand of candidates) {
    const other = span(cand, c);
    for (const t of linesOf(span(cand, axis))) {
      const p = points.find((v) => Math.abs(v - t) < SAME);
      if (p === undefined) continue;
      const prev = byAt.get(p);
      const from = Math.min(own.lo, other.lo, prev?.from ?? Infinity);
      const to = Math.max(own.hi, other.hi, prev?.to ?? -Infinity);
      byAt.set(p, { axis, at: p, from, to });
    }
  }
  return [...byAt.values()];
}

function badge(axis: Axis, a: Span, b: Span, at: number): SpacingBadge {
  return { axis, from: a.hi, to: b.lo, at, value: b.lo - a.hi };
}

function ownGapAt(rect: Rect, other: Span, candidates: Rect[], axis: Axis): number {
  const match = candidates.find((c) => {
    const s = span(c, axis);
    return s.lo === other.lo && s.hi === other.hi;
  });
  return match ? crossMid(rect, match, axis) : span(rect, cross(axis)).lo;
}

function near(a: number | null, b: number): boolean {
  return a !== null && Math.abs(a - b) < SAME;
}

function ownBadges(rect: Rect, candidates: Rect[], axis: Axis, n: Neighbours, values: number[]): SpacingBadge[] {
  const own = span(rect, axis);
  const left = n.before ? own.lo - n.before.hi : null;
  const right = n.after ? n.after.lo - own.hi : null;
  const even = left !== null && left > 0 && near(right, left);
  const out: SpacingBadge[] = [];
  if (n.before && left !== null && left > 0 && (even || values.some((v) => near(left, v)))) out.push(badge(axis, n.before, own, ownGapAt(rect, n.before, candidates, axis)));
  if (n.after && right !== null && right > 0 && (even || values.some((v) => near(right, v)))) out.push(badge(axis, own, n.after, ownGapAt(rect, n.after, candidates, axis)));
  return out;
}

function spacingFor(rect: Rect, candidates: Rect[], axis: Axis): SpacingBadge[] {
  const n = neighboursOf(rect, candidates, axis);
  const own = span(rect, axis);
  const left = n.before ? own.lo - n.before.hi : null;
  const right = n.after ? n.after.lo - own.hi : null;
  const matched = n.gaps.filter((g) => near(left, g.b.lo - g.a.hi) || near(right, g.b.lo - g.a.hi));
  const values = matched.map((g) => g.b.lo - g.a.hi);
  return [...matched.map((g) => badge(axis, g.a, g.b, g.at)), ...ownBadges(rect, candidates, axis, n, values)];
}

export function snapRect(input: SnapInput): SnapResult {
  const threshold = SNAP_PX / Math.max(input.zoom, 0.01);
  let rect = input.rect;
  rect = shifted(rect, 'x', input.x, axisDelta(input, 'x', threshold));
  rect = shifted(rect, 'y', input.y, axisDelta(input, 'y', threshold));
  const guides: SnapGuide[] = [];
  const spacing: SpacingBadge[] = [];
  for (const axis of ['x', 'y'] as const) {
    const kind = input[axis];
    if (!kind) continue;
    guides.push(...guidesFor(rect, input.candidates, axis, kind));
    if (kind === 'move') spacing.push(...spacingFor(rect, input.candidates, axis));
  }
  return { rect, guides, spacing };
}

export function snapOff(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.metaKey || event.ctrlKey;
}

export function unionBox(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
