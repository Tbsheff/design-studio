interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Axis = "x" | "y";

type SnapKind = "move" | "end" | null;

interface SnapGuide {
  axis: Axis;
  at: number;
  from: number;
  to: number;
}

interface SpacingBadge {
  axis: Axis;
  from: number;
  to: number;
  at: number;
  value: number;
}

interface SnapResult {
  rect: Rect;
  guides: SnapGuide[];
  spacing: SpacingBadge[];
}

interface SnapInput {
  rect: Rect;
  candidates: Rect[];
  zoom: number;
  x: SnapKind;
  y: SnapKind;
}

const SNAP_PX = 6;
const SAME = 0.5;

interface Span {
  lo: number;
  hi: number;
}

const span = (r: Rect, axis: Axis): Span =>
  axis === "x"
    ? { hi: r.x + r.width, lo: r.x }
    : { hi: r.y + r.height, lo: r.y };

const cross = (axis: Axis): Axis => (axis === "x" ? "y" : "x");

const linesOf = (s: Span): number[] => [s.lo, (s.lo + s.hi) / 2, s.hi];

const overlaps = (a: Span, b: Span): boolean =>
  Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > 0;

const movingPoints = (s: Span, kind: Exclude<SnapKind, null>): number[] =>
  kind === "move" ? linesOf(s) : [s.hi];

const nearest = (deltas: number[], threshold: number): number | null => {
  let best: number | null = null;

  for (const d of deltas) {
    if (
      Math.abs(d) <= threshold &&
      (best === null || Math.abs(d) < Math.abs(best))
    ) {
      best = d;
    }
  }

  return best;
};

const edgeDeltas = (
  own: Span,
  kind: Exclude<SnapKind, null>,
  candidates: Rect[],
  axis: Axis
): number[] => {
  const points = movingPoints(own, kind);
  const out: number[] = [];

  for (const c of candidates) {
    for (const t of linesOf(span(c, axis))) {
      for (const p of points) {
        out.push(t - p);
      }
    }
  }

  return out;
};

interface Neighbours {
  before: Span | null;
  after: Span | null;
  gaps: { a: Span; b: Span; at: number }[];
}

const crossMid = (a: Rect, b: Rect, axis: Axis): number => {
  const c = cross(axis);
  const sa = span(a, c);
  const sb = span(b, c);

  return (Math.max(sa.lo, sb.lo) + Math.min(sa.hi, sb.hi)) / 2;
};

const existingGaps = (candidates: Rect[], axis: Axis): Neighbours["gaps"] => {
  const c = cross(axis);
  const gaps: Neighbours["gaps"] = [];

  for (const a of candidates) {
    const sa = span(a, axis);
    let next: Rect | null = null;

    for (const b of candidates) {
      const sb = span(b, axis);

      if (b === a || sb.lo < sa.hi || !overlaps(span(a, c), span(b, c))) {
        continue;
      }

      if (!next || sb.lo < span(next, axis).lo) {
        next = b;
      }
    }

    if (next && span(next, axis).lo - sa.hi > 0) {
      gaps.push({ a: sa, at: crossMid(a, next, axis), b: span(next, axis) });
    }
  }

  return gaps;
};

const neighboursOf = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis
): Neighbours => {
  const own = span(rect, axis);
  const c = cross(axis);
  let before: Span | null = null;
  let after: Span | null = null;

  for (const cand of candidates) {
    if (!overlaps(span(rect, c), span(cand, c))) {
      continue;
    }

    const s = span(cand, axis);

    if (s.hi <= own.lo && (!before || s.hi > before.hi)) {
      before = s;
    }

    if (s.lo >= own.hi && (!after || s.lo < after.lo)) {
      after = s;
    }
  }

  return { after, before, gaps: existingGaps(candidates, axis) };
};

const spacingDeltas = (own: Span, n: Neighbours): number[] => {
  const out: number[] = [];

  for (const g of n.gaps) {
    const value = g.b.lo - g.a.hi;

    if (n.before) {
      out.push(n.before.hi + value - own.lo);
    }

    if (n.after) {
      out.push(n.after.lo - value - own.hi);
    }
  }

  if (n.before && n.after) {
    out.push((n.before.hi + n.after.lo - (own.hi - own.lo)) / 2 - own.lo);
  }

  return out;
};

const axisDelta = (input: SnapInput, axis: Axis, threshold: number): number => {
  const kind = input[axis];

  if (!kind) {
    return 0;
  }

  const own = span(input.rect, axis);
  const deltas = edgeDeltas(own, kind, input.candidates, axis);

  if (kind === "move") {
    deltas.push(
      ...spacingDeltas(own, neighboursOf(input.rect, input.candidates, axis))
    );
  }

  return nearest(deltas, threshold) ?? 0;
};

const shifted = (
  rect: Rect,
  axis: Axis,
  kind: SnapKind,
  delta: number
): Rect => {
  if (!kind || delta === 0) {
    return rect;
  }

  if (kind === "move") {
    return axis === "x"
      ? { ...rect, x: rect.x + delta }
      : { ...rect, y: rect.y + delta };
  }

  return axis === "x"
    ? { ...rect, width: Math.max(1, rect.width + delta) }
    : { ...rect, height: Math.max(1, rect.height + delta) };
};

const guidesFor = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis,
  kind: Exclude<SnapKind, null>
): SnapGuide[] => {
  const points = movingPoints(span(rect, axis), kind);
  const c = cross(axis);
  const own = span(rect, c);
  const byAt = new Map<number, SnapGuide>();

  for (const cand of candidates) {
    const other = span(cand, c);

    for (const t of linesOf(span(cand, axis))) {
      const p = points.find((v) => Math.abs(v - t) < SAME);

      if (p === undefined) {
        continue;
      }

      const prev = byAt.get(p);
      const from = Math.min(own.lo, other.lo, prev?.from ?? Infinity);
      const to = Math.max(own.hi, other.hi, prev?.to ?? -Infinity);
      byAt.set(p, { at: p, axis, from, to });
    }
  }

  return [...byAt.values()];
};

const badge = (axis: Axis, a: Span, b: Span, at: number): SpacingBadge => ({
  at,
  axis,
  from: a.hi,
  to: b.lo,
  value: b.lo - a.hi,
});

const ownGapAt = (
  rect: Rect,
  other: Span,
  candidates: Rect[],
  axis: Axis
): number => {
  const match = candidates.find((c) => {
    const s = span(c, axis);

    return s.lo === other.lo && s.hi === other.hi;
  });

  return match ? crossMid(rect, match, axis) : span(rect, cross(axis)).lo;
};

const near = (a: number | null, b: number): boolean =>
  a !== null && Math.abs(a - b) < SAME;

const ownBadges = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis,
  n: Neighbours,
  values: number[]
): SpacingBadge[] => {
  const own = span(rect, axis);
  const left = n.before ? own.lo - n.before.hi : null;
  const right = n.after ? n.after.lo - own.hi : null;
  const even = left !== null && left > 0 && near(right, left);
  const out: SpacingBadge[] = [];

  if (
    n.before &&
    left !== null &&
    left > 0 &&
    (even || values.some((v) => near(left, v)))
  ) {
    out.push(
      badge(axis, n.before, own, ownGapAt(rect, n.before, candidates, axis))
    );
  }

  if (
    n.after &&
    right !== null &&
    right > 0 &&
    (even || values.some((v) => near(right, v)))
  ) {
    out.push(
      badge(axis, own, n.after, ownGapAt(rect, n.after, candidates, axis))
    );
  }

  return out;
};

const spacingFor = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis
): SpacingBadge[] => {
  const n = neighboursOf(rect, candidates, axis);
  const own = span(rect, axis);
  const left = n.before ? own.lo - n.before.hi : null;
  const right = n.after ? n.after.lo - own.hi : null;

  const matched = n.gaps.filter(
    (g) => near(left, g.b.lo - g.a.hi) || near(right, g.b.lo - g.a.hi)
  );

  const values = matched.map((g) => g.b.lo - g.a.hi);

  return [
    ...matched.map((g) => badge(axis, g.a, g.b, g.at)),
    ...ownBadges(rect, candidates, axis, n, values),
  ];
};

const snapRect = (input: SnapInput): SnapResult => {
  const threshold = SNAP_PX / Math.max(input.zoom, 0.01);
  let { rect } = input;
  rect = shifted(rect, "x", input.x, axisDelta(input, "x", threshold));
  rect = shifted(rect, "y", input.y, axisDelta(input, "y", threshold));
  const guides: SnapGuide[] = [];
  const spacing: SpacingBadge[] = [];

  for (const axis of ["x", "y"] as const) {
    const kind = input[axis];

    if (!kind) {
      continue;
    }

    guides.push(...guidesFor(rect, input.candidates, axis, kind));

    if (kind === "move") {
      spacing.push(...spacingFor(rect, input.candidates, axis));
    }
  }

  return { guides, rect, spacing };
};

const snapOff = (event: { metaKey: boolean; ctrlKey: boolean }): boolean =>
  event.metaKey || event.ctrlKey;

const unionBox = (rects: Rect[]): Rect | null => {
  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
};

export { SNAP_PX, snapOff, snapRect, unionBox };

export type {
  Axis,
  Rect,
  SnapGuide,
  SnapInput,
  SnapKind,
  SnapResult,
  SpacingBadge,
};
