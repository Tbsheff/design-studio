import type { DirectStyleProperty } from "@design-studio/actions/_core/contracts";
import {
  lengthToPx,
  resolveTokenValue,
  varName,
} from "../../../shared/token-match.js";
import { formatNumber, parseNumber } from "./css-values.js";
import { sameEditValues } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";
import type { TokenUi } from "./use-token-snap.js";

interface NumberSpec {
  prop: DirectStyleProperty;
  label: string;
  edit: DirectEdit;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  targets?: DirectStyleProperty[];
  display?: string;
}

const SCRUB_PX_PER_STEP = 2;

const plainLength = (value: string, ui: TokenUi | null): string => {
  if (!ui || !varName(value)) {
    return value;
  }

  const resolved = resolveTokenValue(value, ui.entries, ui.mode);
  const px = lengthToPx(resolved);

  return px === null ? resolved : formatNumber(px, "px");
};

const displayLength = (value: string): string => {
  const parsed = parseNumber(value);

  if (!parsed || parsed.unit !== "px" || Number.isInteger(parsed.value)) {
    return value;
  }

  return formatNumber(Math.round(parsed.value * 10) / 10, "px");
};

const clamp = (value: string, spec: NumberSpec): string => {
  const parsed = parseNumber(value);

  if (!parsed) {
    return value;
  }

  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  const bounded = Math.min(hi, Math.max(lo, parsed.value));

  return bounded === parsed.value ? value : formatNumber(bounded, parsed.unit);
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
  event: { shiftKey: boolean; altKey?: boolean },
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

const sameSpec = (a: NumberSpec, b: NumberSpec): boolean => {
  const targets = a.targets ?? [a.prop];

  const sameShape =
    a.prop === b.prop &&
    a.label === b.label &&
    a.unit === b.unit &&
    a.step === b.step &&
    a.min === b.min &&
    a.max === b.max &&
    a.display === b.display;

  return (
    sameShape &&
    targets.join(",") === (b.targets ?? [b.prop]).join(",") &&
    sameEditValues(a.edit, b.edit, targets)
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
  sameSpec,
};

export type { NumberSpec };
