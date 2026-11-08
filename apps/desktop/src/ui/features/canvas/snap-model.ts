const MAX_0_01 = 0.01;

const toPosition = (left: number, top: number): { x: number; y: number } => ({
  x: left,
  y: top,
});

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

const span = (rectValue: Rect, axis: Axis): Span => {
  if (axis === "x") {
    return { hi: rectValue.x + rectValue.width, lo: rectValue.x };
  }

  return { hi: rectValue.y + rectValue.height, lo: rectValue.y };
};

const cross = (axis: Axis): Axis => {
  if (axis === "x") {
    return "y";
  }

  return "x";
};

const linesOf = (spanValue: Span): number[] => [
  spanValue.lo,
  (spanValue.lo + spanValue.hi) / 2,
  spanValue.hi,
];

const overlaps = (span3: Span, span4: Span): boolean =>
  Math.min(span3.hi, span4.hi) - Math.max(span3.lo, span4.lo) > 0;

const movingPoints = (span5: Span, kind: Exclude<SnapKind, null>): number[] => {
  if (kind === "move") {
    return linesOf(span5);
  }

  return [span5.hi];
};

const nearest = (deltas: number[], threshold: number): number | null => {
  let best: number | null = null;

  for (const deltaValue of deltas) {
    if (
      Math.abs(deltaValue) <= threshold &&
      (best === null || Math.abs(deltaValue) < Math.abs(best))
    ) {
      best = deltaValue;
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

  for (const rect3 of candidates) {
    for (const target of linesOf(span(rect3, axis))) {
      for (const point of points) {
        out.push(target - point);
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

const crossMid = (rect4: Rect, rect5: Rect, axis: Axis): number => {
  const axisValue = cross(axis);
  const sa = span(rect4, axisValue);
  const sb = span(rect5, axisValue);

  return (Math.max(sa.lo, sb.lo) + Math.min(sa.hi, sb.hi)) / 2;
};

const existingGaps = (candidates: Rect[], axis: Axis): Neighbours["gaps"] => {
  const axis3 = cross(axis);
  const gaps: Neighbours["gaps"] = [];

  for (const rect6 of candidates) {
    const sa = span(rect6, axis);
    let next: Rect | null = null;

    for (const rect of candidates) {
      const sb = span(rect, axis);

      if (
        rect === rect6 ||
        sb.lo < sa.hi ||
        !overlaps(span(rect6, axis3), span(rect, axis3))
      ) {
        continue;
      }

      if (!next || sb.lo < span(next, axis).lo) {
        next = rect;
      }
    }

    if (next && span(next, axis).lo - sa.hi > 0) {
      gaps.push({
        a: sa,
        at: crossMid(rect6, next, axis),
        b: span(next, axis),
      });
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
  const axis4 = cross(axis);
  let before: Span | null = null;
  let after: Span | null = null;

  for (const cand of candidates) {
    if (!overlaps(span(rect, axis4), span(cand, axis4))) {
      continue;
    }

    const span6 = span(cand, axis);

    if (span6.hi <= own.lo && (!before || span6.hi > before.hi)) {
      before = span6;
    }

    if (span6.lo >= own.hi && (!after || span6.lo < after.lo)) {
      after = span6;
    }
  }

  return { after, before, gaps: existingGaps(candidates, axis) };
};

const spacingDeltas = (own: Span, count: Neighbours): number[] => {
  const out: number[] = [];

  for (const group of count.gaps) {
    const value = group.b.lo - group.a.hi;

    if (count.before) {
      out.push(count.before.hi + value - own.lo);
    }

    if (count.after) {
      out.push(count.after.lo - value - own.hi);
    }
  }

  if (count.before && count.after) {
    out.push(
      (count.before.hi + count.after.lo - (own.hi - own.lo)) / 2 - own.lo
    );
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
    if (axis === "x") {
      return { ...rect, x: rect.x + delta };
    }

    return { ...rect, y: rect.y + delta };
  }

  if (axis === "x") {
    return { ...rect, width: Math.max(1, rect.width + delta) };
  }

  return { ...rect, height: Math.max(1, rect.height + delta) };
};

const guidesFor = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis,
  kind: Exclude<SnapKind, null>
): SnapGuide[] => {
  const points = movingPoints(span(rect, axis), kind);
  const axis5 = cross(axis);
  const own = span(rect, axis5);
  const byAt = new Map<number, SnapGuide>();

  for (const cand of candidates) {
    const other = span(cand, axis5);

    for (const targetValue of linesOf(span(cand, axis))) {
      const pointValue = points.find(
        (valueValue) => Math.abs(valueValue - targetValue) < SAME
      );

      if (pointValue === undefined) {
        continue;
      }

      const prev = byAt.get(pointValue);
      const from = Math.min(own.lo, other.lo, prev?.from ?? Infinity);
      const to = Math.max(own.hi, other.hi, prev?.to ?? -Infinity);
      byAt.set(pointValue, { at: pointValue, axis, from, to });
    }
  }

  return [...byAt.values()];
};

const badge = (
  axis: Axis,
  span2: Span,
  span3: Span,
  at: number
): SpacingBadge => ({
  at,
  axis,
  from: span2.hi,
  to: span3.lo,
  value: span3.lo - span2.hi,
});

const ownGapAt = (
  rect: Rect,
  other: Span,
  candidates: Rect[],
  axis: Axis
): number => {
  const match = candidates.find((rect2) => {
    const span4 = span(rect2, axis);

    return span4.lo === other.lo && span4.hi === other.hi;
  });

  if (match) {
    return crossMid(rect, match, axis);
  }

  return span(rect, cross(axis)).lo;
};

const near = (first: number | null, second: number): boolean =>
  first !== null && Math.abs(first - second) < SAME;

const ownBadges = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis,
  countValue: Neighbours,
  values: number[]
): SpacingBadge[] => {
  const own = span(rect, axis);

  let left: number | null = null;

  if (countValue.before) {
    left = own.lo - countValue.before.hi;
  }

  let right: number | null = null;

  if (countValue.after) {
    right = countValue.after.lo - own.hi;
  }
  const even = left !== null && left > 0 && near(right, left);
  const out: SpacingBadge[] = [];

  if (
    countValue.before &&
    left !== null &&
    left > 0 &&
    (even || values.some((value3) => near(left, value3)))
  ) {
    out.push(
      badge(
        axis,
        countValue.before,
        own,
        ownGapAt(rect, countValue.before, candidates, axis)
      )
    );
  }

  if (
    countValue.after &&
    right !== null &&
    right > 0 &&
    (even || values.some((value4) => near(right, value4)))
  ) {
    out.push(
      badge(
        axis,
        own,
        countValue.after,
        ownGapAt(rect, countValue.after, candidates, axis)
      )
    );
  }

  return out;
};

const spacingFor = (
  rect: Rect,
  candidates: Rect[],
  axis: Axis
): SpacingBadge[] => {
  const count3 = neighboursOf(rect, candidates, axis);
  const own = span(rect, axis);

  let left: number | null = null;

  if (count3.before) {
    left = own.lo - count3.before.hi;
  }

  let right: number | null = null;

  if (count3.after) {
    right = count3.after.lo - own.hi;
  }

  const matched = count3.gaps.filter(
    (groupValue) =>
      near(left, groupValue.b.lo - groupValue.a.hi) ||
      near(right, groupValue.b.lo - groupValue.a.hi)
  );

  const values = matched.map((group3) => group3.b.lo - group3.a.hi);

  return [
    ...matched.map((group4) => badge(axis, group4.a, group4.b, group4.at)),
    ...ownBadges(rect, candidates, axis, count3, values),
  ];
};

const snapRect = (input: SnapInput): SnapResult => {
  const threshold = SNAP_PX / Math.max(input.zoom, MAX_0_01);
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

  const left = Math.min(...rects.map((rect3) => rect3.x));
  const top = Math.min(...rects.map((rect4) => rect4.y));
  const right = Math.max(...rects.map((rect5) => rect5.x + rect5.width));
  const bottom = Math.max(...rects.map((rect6) => rect6.y + rect6.height));

  return { height: bottom - top, width: right - left, x: left, y: top };
};

export { SNAP_PX, snapOff, snapRect, toPosition, unionBox };

export type {
  Axis,
  Rect,
  SnapGuide,
  SnapInput,
  SnapKind,
  SnapResult,
  SpacingBadge,
};
