import type { SelectionContext } from "@design-studio/contracts";

import { copy } from "./copy.js";

interface ScaleResult {
  readonly changed: readonly string[];
  readonly skipped: readonly { readonly reason: string }[];
  readonly tokenCount: number;
}

const FULL_PERCENT = 100;

const MIN_PERCENT = 25;

const MAX_PERCENT = 400;

const SCRUB_PX_PER_PERCENT = 2;

const FULL_TEXT = String(FULL_PERCENT);

const toScaleLayerId = (selection: SelectionContext): string | null => {
  const { source } = selection;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toScalePercent = (text: string): number | null => {
  const value = Number(text.replace("%", "").trim());

  if (!Number.isFinite(value) || text.trim() === "") {
    return null;
  }

  return value;
};

const isScaleInRange = (percent: number): boolean =>
  percent >= MIN_PERCENT && percent <= MAX_PERCENT;

const toScrubPercent = (start: number, deltaX: number): number => {
  const next = Math.round(start + deltaX / SCRUB_PX_PER_PERCENT);

  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, next));
};

const toLayerCount = (count: number): string => {
  if (count === 1) {
    return `${count}${copy.scaleLayer}`;
  }

  return `${count}${copy.scaleLayers}`;
};

const toTokenNote = (result: ScaleResult, isKept: boolean): string => {
  if (result.tokenCount === 0) {
    return "";
  }

  const count = result.tokenCount;

  if (count === 1 && isKept) {
    return ` ${count}${copy.scaleTokenKept}`;
  }

  if (count === 1) {
    return ` ${count}${copy.scaleTokenChanged}`;
  }

  if (isKept) {
    return ` ${count}${copy.scaleTokensKept}`;
  }

  return ` ${count}${copy.scaleTokensChanged}`;
};

const toScaleNote = (result: ScaleResult, isKept: boolean): string => {
  const tokens = toTokenNote(result, isKept);

  if (result.changed.length === 0) {
    const [first] = result.skipped;

    return `${first?.reason ?? copy.scaleNothing}${tokens}`;
  }

  return `${copy.scaled}${toLayerCount(result.changed.length)}.${tokens}`;
};

export {
  FULL_PERCENT,
  FULL_TEXT,
  isScaleInRange,
  toScaleLayerId,
  toScaleNote,
  toScalePercent,
  toScrubPercent,
};

export type { ScaleResult };
