import { toGapHit } from "./align-gap.js";
import {
  EDGE_MAX,
  SAME,
  isMajority,
  isNear,
  toEdge,
  toLines,
  toMarginFix,
  toMarginProp,
  toMode,
  toSides,
} from "./align-lines.js";
import type {
  AlignAxis,
  AlignChild,
  AlignFix,
  AlignHit,
  AlignLine,
  AlignProbeResult,
  AlignSide,
  EdgeOffset,
} from "./align-lines.js";

const LINE_MIN = 3;
const HIT_CAP = 12;
const MEDIUM_FROM = 3;

const EDGE_HINT =
  "Align this element with its siblings: remove the extra margin or offset, or give it the same size. Keep the rest of the layout as it is.";

const SIDE_WORD: Readonly<
  Record<AlignAxis, Readonly<Record<AlignSide, string>>>
> = {
  column: { center: "center", end: "right edge", start: "left edge" },
  row: { center: "center", end: "bottom edge", start: "top edge" },
};

const isOwnAlign = (child: AlignChild, line: AlignLine): boolean =>
  child.alignSelf === "auto" || child.alignSelf === line.align;

const toOffsets = (line: AlignLine, edgeSide: AlignSide): EdgeOffset[] => {
  const kept = line.children.filter((child) => isOwnAlign(child, line));
  const mode = toMode(kept.map((child) => toEdge(child, line.axis, edgeSide)));

  if (kept.length < LINE_MIN || !isMajority(mode, kept.length)) {
    return [];
  }

  return kept.map((each): EdgeOffset => ({
    child: each,
    offset: toEdge(each, line.axis, edgeSide) - mode.value,
    others: mode.count,
    side: edgeSide,
  }));
};

const isCentered = (
  start: EdgeOffset,
  ends: readonly EdgeOffset[]
): boolean => {
  const end = ends.find((each) => each.child === start.child);

  return Boolean(end) && Math.abs(start.offset + (end?.offset ?? 0)) <= SAME;
};

const toEdgeFix = (hit: EdgeOffset, axis: AlignAxis): AlignFix | null => {
  if (hit.side === "center") {
    return null;
  }

  const prop = toMarginProp(axis, hit.side);

  if (hit.side === "start") {
    return toMarginFix(hit.child, prop, -hit.offset);
  }

  return toMarginFix(hit.child, prop, hit.offset);
};

const toDirection = (axis: AlignAxis, offset: number): string => {
  if (axis === "row" && offset > 0) {
    return "lower";
  }

  if (axis === "row") {
    return "higher";
  }

  if (offset > 0) {
    return "further right";
  }

  return "further left";
};

const toPlural = (line: AlignLine, child: AlignChild): string => {
  const others = line.children.filter((each) => each !== child);

  if (others.every((each) => each.noun === child.noun)) {
    return `${child.noun}s`;
  }

  return "elements";
};

const toEdgeMessage = (hit: EdgeOffset, line: AlignLine): string => {
  const px = Math.round(Math.abs(hit.offset));
  const way = toDirection(line.axis, hit.offset);
  const plural = toPlural(line, hit.child);
  let where = "beside it";

  if (line.axis === "column") {
    where = "in this column";
  }

  if (hit.side === "start" && line.axis === "row") {
    return `This ${hit.child.noun} is ${px} px ${way} than the ${hit.others} ${plural} ${where}.`;
  }

  const word = SIDE_WORD[line.axis][hit.side];

  return `The ${word} of this ${hit.child.noun} is ${px} px ${way} than the ${word}s of the ${hit.others} ${plural} ${where}.`;
};

const toEdgeKey = (hit: EdgeOffset, line: AlignLine): string => {
  if (line.role === "column") {
    return `edge|${hit.child.selector}|column-${hit.side}`;
  }

  return `edge|${hit.child.selector}|${hit.side}`;
};

const toEdgeHit = (hit: EdgeOffset, line: AlignLine): AlignHit => ({
  fix: toEdgeFix(hit, line.axis),
  hint: EDGE_HINT,
  key: toEdgeKey(hit, line),
  message: toEdgeMessage(hit, line),
  selector: hit.child.selector,
  severity: "low",
});

const isEdgeHit = (
  each: EdgeOffset,
  ends: readonly EdgeOffset[],
  seen: ReadonlySet<AlignChild>
): boolean =>
  !seen.has(each.child) &&
  isNear(each.offset, EDGE_MAX) &&
  (each.side !== "start" || !isCentered(each, ends));

const toEdgeHits = (line: AlignLine): AlignHit[] => {
  const sides = toSides(line);
  const bySide = new Map(sides.map((side) => [side, toOffsets(line, side)]));
  const ends = bySide.get("end") ?? [];
  const seen = new Set<AlignChild>();
  const hits: AlignHit[] = [];

  for (const side of sides) {
    for (const each of bySide.get(side) ?? []) {
      if (isEdgeHit(each, ends, seen)) {
        seen.add(each.child);
        hits.push(toEdgeHit(each, line));
      }
    }
  }

  return hits;
};

const toLineHits = (line: AlignLine): AlignHit[] => {
  const gap = toGapHit(line);
  const edges = toEdgeHits(line);

  if (gap) {
    return [gap, ...edges];
  }

  return edges;
};

const toMedium = (hit: AlignHit): AlignHit => ({
  fix: hit.fix,
  hint: hit.hint,
  key: hit.key,
  message: hit.message,
  selector: hit.selector,
  severity: "medium",
});

const toAlignHits = (facts: AlignProbeResult): AlignHit[] => {
  const hits: AlignHit[] = [];

  for (const group of facts.groups) {
    for (const line of toLines(group)) {
      hits.push(...toLineHits(line));
    }
  }

  const kept = hits.slice(0, HIT_CAP);

  if (kept.length < MEDIUM_FROM) {
    return kept;
  }

  return kept.map((hit) => toMedium(hit));
};

export { toAlignHits };

export type { AlignFix, AlignHit, AlignProbeResult };
