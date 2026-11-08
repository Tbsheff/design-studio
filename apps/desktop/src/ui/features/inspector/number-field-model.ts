import type { DirectStyleProperty } from "@design-studio/contracts";

import {
  lengthToPx,
  resolveTokenValue,
  varName,
} from "../../../shared/token-match.js";
import { toNumberText, toParsedNumber } from "./css-value-model.js";
import { isSameEditValues } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";
import type { TokenUi } from "./use-token-snap.js";

interface NumberSpec {
  readonly prop: DirectStyleProperty;
  readonly label: string;
  readonly edit: DirectEdit;
  readonly unit?: string;
  readonly step?: number;
  readonly min?: number;
  readonly max?: number;
  readonly targets?: DirectStyleProperty[];
  readonly display?: string;
}

const SCRUB_PX_PER_STEP = 2;

const plainLength = (value: string, ui: TokenUi | null): string => {
  if (!ui || !varName(value)) {
    return value;
  }

  const resolved = resolveTokenValue(value, ui.entries, ui.mode);
  const px = lengthToPx(resolved);

  return px === null ? resolved : toNumberText(px, "px");
};

const displayLength = (value: string): string => {
  const parsed = toParsedNumber(value);

  if (!parsed || parsed.unit !== "px" || Number.isInteger(parsed.value)) {
    return value;
  }

  return toNumberText(Math.round(parsed.value * 10) / 10, "px");
};

const clamp = (value: string, spec: NumberSpec): string => {
  const parsed = toParsedNumber(value);

  if (!parsed) {
    return value;
  }

  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  const bounded = Math.min(hi, Math.max(lo, parsed.value));

  return bounded === parsed.value ? value : toNumberText(bounded, parsed.unit);
};

const patchFor = (
  spec: NumberSpec,
  value: string
): Partial<Record<DirectStyleProperty, string>> => {
  const targets = spec.targets ?? [spec.prop];

  return Object.fromEntries(targets.map((prop) => [prop, value]));
};

const shiftMixed = (spec: NumberSpec, delta: number): void => {
  spec.edit.shift(spec.targets ?? [spec.prop], delta, {
    max: spec.max,
    min: spec.min,
  });
};

const stepOf = (
  event: Pick<KeyboardEvent, "altKey" | "shiftKey">,
  spec: NumberSpec
): number => {
  const base = spec.step ?? 1;

  if (event.shiftKey) {
    return base * 10;
  }

  return event.altKey ? base / 10 : base;
};

const isValidValue = (prop: DirectStyleProperty, value: string): boolean => {
  if (value.trim() === "" || typeof CSS === "undefined" || !CSS.supports) {
    return true;
  }

  return CSS.supports(prop, value);
};

const selectSoon = (input: HTMLInputElement): void => {
  requestAnimationFrame(() => {
    if (document.activeElement === input) {
      input.select();
    }
  });
};

const isSameSpec = (first: NumberSpec, second: NumberSpec): boolean => {
  const targets = first.targets ?? [first.prop];

  const sameShape =
    first.prop === second.prop &&
    first.label === second.label &&
    first.unit === second.unit &&
    first.step === second.step &&
    first.min === second.min &&
    first.max === second.max &&
    first.display === second.display;

  return (
    sameShape &&
    targets.join(",") === (second.targets ?? [second.prop]).join(",") &&
    isSameEditValues(first.edit, second.edit, targets)
  );
};

export {
  SCRUB_PX_PER_STEP,
  plainLength,
  displayLength,
  clamp,
  patchFor,
  shiftMixed,
  stepOf,
  isValidValue,
  selectSoon,
  isSameSpec as sameSpec,
};

export type { NumberSpec };
