import type { PriorMap } from "./to-priors.js";
import type {
  AttentionElement,
  AttentionGrid,
  RankedElement,
} from "./types.js";

const SHARE_DIGITS = 1000;

const toRounded = (value: number): number =>
  Math.round(value * SHARE_DIGITS) / SHARE_DIGITS;

const toRankedElements = (
  elements: readonly AttentionElement[],
  grid: AttentionGrid,
  priors: PriorMap
): RankedElement[] => {
  const mass = new Float64Array(elements.length);
  let total = 0;

  for (const [index, value] of grid.values.entries()) {
    const owner = priors.owners[index] ?? -1;

    total += value;

    if (owner >= 0) {
      mass[owner] = (mass[owner] ?? 0) + value;
    }
  }

  const scored = elements.flatMap((element, index) => {
    const share = toRounded(
      (mass[index] ?? 0) / Math.max(total, Number.EPSILON)
    );

    if (share <= 0) {
      return [];
    }

    return [{ element, index, share }];
  });

  scored.sort(
    (left, right) => right.share - left.share || left.index - right.index
  );

  return scored.map((item, position) => ({
    element: item.element,
    rank: position + 1,
    share: item.share,
  }));
};

const toShareOf = (
  ranked: readonly RankedElement[],
  position: number
): number => ranked[position]?.share ?? 0;

const DOMINANT_SHARE = 0.3;

const DOMINANCE_WEIGHT = 0.55;

const GAP_WEIGHT = 0.45;

const MAX_CLARITY = 100;

const toClarityScore = (ranked: readonly RankedElement[]): number => {
  const first = toShareOf(ranked, 0);
  const second = toShareOf(ranked, 1);

  if (first <= 0) {
    return 0;
  }

  const dominance = Math.min(1, first / DOMINANT_SHARE);
  const gap = (first - second) / first;

  return Math.round(
    MAX_CLARITY * (DOMINANCE_WEIGHT * dominance + GAP_WEIGHT * gap)
  );
};

export { toClarityScore, toRankedElements, toShareOf };
