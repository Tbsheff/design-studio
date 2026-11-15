import {
  GAP_MAX,
  isMajority,
  isNear,
  toMarginFix,
  toMode,
  toSize,
  toStart,
} from "./align-lines.js";
import type {
  AlignFix,
  AlignHit,
  AlignLine,
  AlignMarginProp,
} from "./align-lines.js";

const GAP_LINE_MIN = 4;
const SIZE_SPREAD = 0.1;
const HALF = 2;

const GAP_HINT =
  "Use one gap between the items: set the same margin on each item, or use gap on the parent and remove the item margins.";

const toMedian = (values: readonly number[]): number => {
  const sorted = values.toSorted((left, right) => left - right);

  return sorted[Math.floor(sorted.length / HALF)] ?? 0;
};

const isSimilar = (values: readonly number[]): boolean => {
  const median = toMedian(values);

  return values.every(
    (value) => Math.abs(value - median) <= median * SIZE_SPREAD
  );
};

const isUniformLine = (line: AlignLine): boolean => {
  const [first] = line.children;

  return (
    line.children.length >= GAP_LINE_MIN &&
    line.children.every((child) => child.tag === first?.tag) &&
    isSimilar(line.children.map((child) => child.width)) &&
    isSimilar(line.children.map((child) => child.height))
  );
};

const toGaps = (line: AlignLine): number[] =>
  line.children.slice(1).map((child, index) => {
    const before = line.children[index] ?? child;

    return (
      toStart(child, line.axis) -
      toStart(before, line.axis) -
      toSize(before, line.axis)
    );
  });

const toGapText = (gaps: readonly number[]): string => {
  const shown = gaps.map((gap) => `${Math.round(gap * HALF) / HALF}`);
  const last = shown.at(-1) ?? "";

  return `${shown.slice(0, -1).join(", ")} and ${last}`;
};

const toLineWord = (line: AlignLine): string => {
  if (line.role === "rows") {
    return "grid";
  }

  if (line.group.tag === "ul" || line.group.tag === "ol") {
    return "list";
  }

  return line.axis;
};

const toGapFix = (
  line: AlignLine,
  at: number,
  change: number
): AlignFix | null => {
  const { [at]: before, [at + 1]: after } = line.children;

  if (!before || !after) {
    return null;
  }

  let startProp: AlignMarginProp = "margin-left";
  let endProp: AlignMarginProp = "margin-right";

  if (line.axis === "column") {
    startProp = "margin-top";
    endProp = "margin-bottom";
  }

  return (
    toMarginFix(after, startProp, change) ??
    toMarginFix(before, endProp, change)
  );
};

const toOffGaps = (gaps: readonly number[], common: number): number[] =>
  gaps.flatMap((gap, at) => {
    if (isNear(gap - common, GAP_MAX)) {
      return [at];
    }

    return [];
  });

const toGapKey = (line: AlignLine): string => {
  if (line.role === "rows") {
    return `gap|${line.group.selector}|rows`;
  }

  return `gap|${line.group.selector}|${line.children[0]?.selector ?? ""}`;
};

const toGapHit = (line: AlignLine): AlignHit | null => {
  if (line.role === "column" || !isUniformLine(line)) {
    return null;
  }

  const gaps = toGaps(line);
  const mode = toMode(gaps);
  const off = toOffGaps(gaps, mode.value);

  if (!isMajority(mode, gaps.length) || off.length === 0) {
    return null;
  }

  const at = off[0] ?? 0;
  let fix: AlignFix | null = null;

  if (off.length === 1) {
    fix = toGapFix(line, at, mode.value - (gaps[at] ?? mode.value));
  }

  return {
    fix,
    hint: GAP_HINT,
    key: toGapKey(line),
    message: `The gaps in this ${toLineWord(line)} are ${toGapText(gaps)} px. Use one gap.`,
    selector: line.group.selector,
    severity: "low",
  };
};

export { toGapHit };
