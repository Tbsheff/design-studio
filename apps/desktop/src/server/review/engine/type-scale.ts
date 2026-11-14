import {
  toCounts,
  toEachHit,
  toMode,
  toName,
  toNearest,
  toNearestStep,
  toPx,
  toRounded,
  toStyleFix,
} from "./type-facts.js";
import type {
  TypeFix,
  TypeHit,
  TypeSeverity,
  TypeStep,
  TypeText,
} from "./type-facts.js";

const MAX_SIZES = 7;

const MANY_SIZES = 9;

const RARE_SIZE = 2;

const MIN_TEXT = 14;

const TINY_TEXT = 12;

const HIERARCHY_RATIO = 1.25;

const LEVEL_GAP = 2;

const MAX_FAMILIES = 3;

const SNAP_PX = 2;

const SNAP_SHARE = 0.12;

const isNearSize = (size: number, near: number): boolean =>
  Math.abs(size - near) <= Math.max(SNAP_PX, size * SNAP_SHARE);

const toSizeList = (counts: ReadonlyMap<number, number>): string =>
  [...counts]
    .toSorted((left, right) => right[0] - left[0])
    .map(([size, count]) => `${toPx(size)} x${count}`)
    .join(", ");

const toSizeFix = (
  size: number,
  common: readonly number[],
  steps: readonly TypeStep[]
): TypeFix | null => {
  const step = toNearestStep(size, steps);

  if (step && isNearSize(size, step.px)) {
    return toStyleFix(`Use ${step.cssVar}`, {
      "font-size": `var(${step.cssVar})`,
    });
  }

  const near = toNearest(size, common);

  if (near === null || !isNearSize(size, near)) {
    return null;
  }

  return toStyleFix(`Use ${toPx(near)}`, { "font-size": `${near}px` });
};

const toCommonSizes = (counts: ReadonlyMap<number, number>): number[] =>
  [...counts].flatMap(([size, count]) => {
    if (count <= RARE_SIZE) {
      return [];
    }

    return [size];
  });

const toSizeSeverity = (count: number): TypeSeverity => {
  if (count > MANY_SIZES) {
    return "high";
  }

  return "medium";
};

const toSizeHits = (
  texts: readonly TypeText[],
  steps: readonly TypeStep[]
): TypeHit[] => {
  const counts = toCounts(texts.map((text) => toRounded(text.size)));

  if (counts.size <= MAX_SIZES) {
    return [];
  }

  const common = toCommonSizes(counts);
  const list = toSizeList(counts);
  const severity = toSizeSeverity(counts.size);

  return toEachHit(
    texts,
    (text) =>
      !text.isHeading && (counts.get(toRounded(text.size)) ?? 0) <= RARE_SIZE,
    (text) => ({
      fix: toSizeFix(toRounded(text.size), common, steps),
      hint: "Use a short type scale: snap each rare font size to a size the frame already uses often, or to a type token.",
      message: `This text is ${toPx(toRounded(text.size))}, 1 of ${counts.size} font sizes on this frame (${list}). Use ${MAX_SIZES} sizes or fewer.`,
      selector: text.selector,
      severity,
    })
  );
};

const toSmallFix = (steps: readonly TypeStep[]): TypeFix => {
  const step = toNearestStep(
    MIN_TEXT,
    steps.filter((item) => item.px >= MIN_TEXT)
  );

  if (step) {
    return toStyleFix(`Use ${step.cssVar}`, {
      "font-size": `var(${step.cssVar})`,
    });
  }

  return toStyleFix(`Use ${toPx(MIN_TEXT)}`, { "font-size": `${MIN_TEXT}px` });
};

const toSmallSeverity = (size: number): TypeSeverity => {
  if (size < TINY_TEXT) {
    return "medium";
  }

  return "low";
};

const toSmallHits = (
  texts: readonly TypeText[],
  steps: readonly TypeStep[]
): TypeHit[] =>
  toEachHit(
    texts,
    (text) => !text.isLabel && !text.isHeading && text.size < MIN_TEXT,
    (text) => ({
      fix: toSmallFix(steps),
      hint: "Set body text at 14 px or more. Keep smaller sizes for labels, captions and badges.",
      message: `This body text is ${toPx(toRounded(text.size))}. Use ${toPx(MIN_TEXT)} or more for text people read.`,
      selector: text.selector,
      severity: toSmallSeverity(text.size),
    })
  );

const toLargest = (headings: readonly TypeText[]): TypeText | null => {
  let best: TypeText | null = null;

  for (const heading of headings) {
    if (best === null || heading.size > best.size) {
      best = heading;
    }
  }

  return best;
};

const toBodySize = (texts: readonly TypeText[]): number | null => {
  const blocks = texts.filter((text) => text.isBlock);

  if (blocks.length > 0) {
    return toMode(blocks.map((text) => toRounded(text.size)));
  }

  return toMode(
    texts.flatMap((text) => {
      if (text.isHeading || text.isLabel) {
        return [];
      }

      return [toRounded(text.size)];
    })
  );
};

const toRatioHits = (texts: readonly TypeText[]): TypeHit[] => {
  const largest = toLargest(texts.filter((text) => text.isHeading));
  const body = toBodySize(texts);

  if (!largest || body === null || largest.size >= body * HIERARCHY_RATIO) {
    return [];
  }

  return [
    {
      fix: null,
      hint: "Make the main heading clearly larger than body text: at least 1.25 times the body size.",
      message: `The largest heading, ${toName(largest)} at ${toPx(toRounded(largest.size))}, is less than ${HIERARCHY_RATIO} times the body size of ${toPx(body)}.`,
      selector: largest.selector,
      severity: "medium",
    },
  ];
};

const toLevelHeads = (texts: readonly TypeText[]): TypeText[] => {
  const byLevel = new Map<number, TypeText>();

  for (const text of texts) {
    const seen = byLevel.get(text.level);

    if (text.isHeading && (!seen || text.size > seen.size)) {
      byLevel.set(text.level, text);
    }
  }

  return [...byLevel.values()].toSorted(
    (left, right) => left.level - right.level
  );
};

const toLevelText = (text: TypeText): string =>
  `h${text.level} ${toName(text)} (${toPx(toRounded(text.size))})`;

const toLevelHits = (texts: readonly TypeText[]): TypeHit[] => {
  const heads = toLevelHeads(texts);

  return heads.slice(1).flatMap((lower, index) => {
    const upper = heads[index];

    if (!upper || Math.abs(upper.size - lower.size) >= LEVEL_GAP) {
      return [];
    }

    return [
      {
        fix: null,
        hint: "Give each heading level its own size, at least 2 px apart, or use one level.",
        message: `Heading levels ${toLevelText(upper)} and ${toLevelText(lower)} differ by less than ${toPx(LEVEL_GAP)}.`,
        selector: lower.selector,
        severity: "medium",
      },
    ];
  });
};

const toFamilyHits = (texts: readonly TypeText[]): TypeHit[] => {
  const counts = toCounts(texts.map((text) => text.family));

  if (counts.size <= MAX_FAMILIES) {
    return [];
  }

  const ranked = [...counts].toSorted((left, right) => right[1] - left[1]);
  const kept = new Set(ranked.slice(0, MAX_FAMILIES).map(([name]) => name));
  const list = ranked.map(([name, count]) => `${name} x${count}`).join(", ");

  return toEachHit(
    texts,
    (text) => !kept.has(text.family),
    (text) => ({
      fix: null,
      hint: "Use 1 or 2 font families, 3 at most, from the project fonts.",
      message: `This text uses ${text.family}, 1 of ${counts.size} font families on this frame (${list}). Use ${MAX_FAMILIES} or fewer.`,
      selector: text.selector,
      severity: "medium",
    })
  );
};

export { toFamilyHits, toLevelHits, toRatioHits, toSizeHits, toSmallHits };
