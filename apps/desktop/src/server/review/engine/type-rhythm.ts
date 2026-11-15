import { SEVERITY_RANK } from "./type-facts.js";
import type {
  TypeFix,
  TypeHit,
  TypeProbeResult,
  TypeSeverity,
  TypeStep,
} from "./type-facts.js";
import {
  toLineHits,
  toLooseHits,
  toSpaceHits,
  toTightHits,
} from "./type-lines.js";
import {
  toFamilyHits,
  toLevelHits,
  toRatioHits,
  toSizeHits,
  toSmallHits,
} from "./type-scale.js";
import { toWrapHits } from "./type-wrap.js";

interface TypeRhythmInput {
  readonly facts: TypeProbeResult;
  readonly spaceSteps: readonly TypeStep[];
  readonly textSteps: readonly TypeStep[];
}

const HIT_CAP = 24;

const toWorst = (left: TypeSeverity, right: TypeSeverity): TypeSeverity => {
  if (SEVERITY_RANK[right] < SEVERITY_RANK[left]) {
    return right;
  }

  return left;
};

const toMergedFix = (
  left: TypeFix | null,
  right: TypeFix | null
): TypeFix | null => {
  if (!left || !right) {
    return left ?? right;
  }

  if (Object.keys(right.style).every((key) => key in left.style)) {
    return left;
  }

  return {
    label: `${left.label}; ${right.label}`,
    style: { ...left.style, ...right.style },
    tailwindClass: left.tailwindClass ?? right.tailwindClass,
  };
};

const toMergedHit = (left: TypeHit, right: TypeHit): TypeHit => ({
  fix: toMergedFix(left.fix, right.fix),
  hint: `${left.hint} ${right.hint}`,
  message: `${left.message} ${right.message}`,
  selector: left.selector,
  severity: toWorst(left.severity, right.severity),
});

const toMerged = (hits: readonly TypeHit[]): TypeHit[] => {
  const bySelector = new Map<string, TypeHit>();

  for (const hit of hits) {
    const seen = bySelector.get(hit.selector);

    if (seen) {
      bySelector.set(hit.selector, toMergedHit(seen, hit));
    } else {
      bySelector.set(hit.selector, hit);
    }
  }

  return [...bySelector.values()];
};

const toTypeHits = (input: TypeRhythmInput): TypeHit[] => {
  const { boxes, texts } = input.facts;

  const hits = [
    ...toSmallHits(texts, input.textSteps),
    ...toSizeHits(texts, input.textSteps),
    ...toLineHits(texts),
    ...toTightHits(texts),
    ...toLooseHits(texts),
    ...toRatioHits(texts),
    ...toLevelHits(texts),
    ...toSpaceHits(boxes, input.spaceSteps),
    ...toFamilyHits(texts),
    ...toWrapHits(texts),
  ];

  return toMerged(hits)
    .toSorted(
      (left, right) =>
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    )
    .slice(0, HIT_CAP);
};

export { toTypeHits };

export type { TypeRhythmInput };
