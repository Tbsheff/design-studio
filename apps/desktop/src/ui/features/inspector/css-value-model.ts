import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";

type StyleValues = Record<DirectStyleProperty, string>;

const SIDES = ["top", "right", "bottom", "left"] as const;

type Side = (typeof SIDES)[number];

const NUMBER_RE =
  /^(?<value>-?(?:\d+(?:\.\d+)?|\.\d+))\s*(?<unit>px|rem|em|%)?$/iu;

const RGB_RE =
  /^rgba?\(\s*(?<red>[\d.]+)[\s,]+(?<green>[\d.]+)[\s,]+(?<blue>[\d.]+)(?:\s*[,/]\s*(?<alpha>[\d.]+%?))?\s*\)$/iu;

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
const TRANSPARENT_RE = /^rgba\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*0\s*\)$/iu;
const BOX_SPLIT_RE = /\s+/u;
const ELEMENT_OPEN_RE = /<[a-zA-Z]/u;
const MAX_TEXT = 300;
const PERCENT = 100;
const BYTE_MAX = 255;
const HEX_RADIX = 16;
const SHORT_HEX_LENGTH = 3;
const PAD_WIDTH = 2;

interface ParsedNumber {
  readonly value: number;
  readonly unit: string;
}

interface Shift {
  readonly delta: number;
  readonly min?: number;
  readonly max?: number;
}

interface ShiftPart {
  readonly key: string;
  readonly map: (raw: string, change: (value: string) => string) => string;
  readonly set?: string;
}

type TextEditability = "ok" | "children" | "long";

const toParsedNumber = (raw: string): ParsedNumber | null => {
  const match = NUMBER_RE.exec(raw.trim());

  if (!match?.groups) {
    return null;
  }

  return {
    unit: (match.groups.unit ?? "").toLowerCase(),
    value: Number(match.groups.value),
  };
};

const toRounded = (value: number): number =>
  Math.round(value * PERCENT) / PERCENT;

const toNumberText = (value: number, unit: string): string =>
  `${toRounded(value)}${unit}`;

const toSteppedValue = (
  raw: string,
  delta: number,
  fallbackUnit: string
): string => {
  const parsed = toParsedNumber(raw) ?? { unit: fallbackUnit, value: 0 };

  return toNumberText(parsed.value + delta, parsed.unit || fallbackUnit);
};

const toShiftedValue = (raw: string, shift: Shift): string | null => {
  const parsed = toParsedNumber(raw);

  if (!parsed) {
    return null;
  }

  const next = Math.min(
    shift.max ?? Infinity,
    Math.max(shift.min ?? -Infinity, parsed.value + shift.delta)
  );

  return toNumberText(next, parsed.unit);
};

const toShiftedPart = (raw: string, part: ShiftPart, shift: Shift): string => {
  const { map } = part;

  return map(raw, (value) => {
    const from = part.set ?? value;
    let next = from;

    if (shift.delta !== 0) {
      next = toShiftedValue(from, shift) ?? from;
    }

    const parsed = toParsedNumber(next);

    if (parsed && parsed.unit === "" && parsed.value !== 0) {
      return toNumberText(parsed.value, "px");
    }

    return next;
  });
};

const toNormalizedLength = (raw: string, defaultUnit: string): string => {
  const trimmed = raw.trim();
  const parsed = toParsedNumber(trimmed);

  if (!parsed || parsed.unit !== "" || defaultUnit === "") {
    return trimmed;
  }

  return toNumberText(parsed.value, defaultUnit);
};

const toHexByte = (value: number): string =>
  Math.max(0, Math.min(BYTE_MAX, Math.round(value)))
    .toString(HEX_RADIX)
    .padStart(PAD_WIDTH, "0");

const toAlphaValue = (raw: string | null): number => {
  if (raw === null) {
    return 1;
  }

  if (raw.endsWith("%")) {
    return Number(raw.slice(0, -1)) / PERCENT;
  }

  return Number(raw);
};

const toHexColor = (raw: string): string | null => {
  const value = raw.trim();

  if (HEX_RE.test(value)) {
    const body = value.slice(1);

    if (body.length === SHORT_HEX_LENGTH) {
      return `#${[...body].map((item) => item + item).join("")}`.toLowerCase();
    }

    return value.toLowerCase();
  }

  const groups = RGB_RE.exec(value)?.groups;

  if (!groups || toAlphaValue(groups.alpha ?? null) < 1) {
    return null;
  }

  return `#${toHexByte(Number(groups.red))}${toHexByte(Number(groups.green))}${toHexByte(Number(groups.blue))}`;
};

const toDisplayColor = (raw: string): string => {
  if (TRANSPARENT_RE.test(raw.trim())) {
    return "transparent";
  }

  return toHexColor(raw) ?? raw.trim();
};

const isValidColor = (raw: string): boolean => {
  const value = raw.trim();

  if (value === "") {
    return false;
  }

  if (!("CSS" in globalThis) || !("supports" in CSS)) {
    return true;
  }

  return CSS.supports("color", value);
};

const toBoxSides = (raw: string | null): Record<Side, string> => {
  const parts = (raw ?? "").trim().split(BOX_SPLIT_RE).filter(Boolean);
  const [top = "", right = top, bottom = top, left = right] = parts;

  return { bottom, left, right, top };
};

const toTidy = (raw: string | null): string => {
  const value = (raw ?? "").trim();
  const parsed = toParsedNumber(value);

  if (parsed) {
    return toNumberText(parsed.value, parsed.unit);
  }

  return value;
};

const toBoxValue = (
  styles: Record<string, string>,
  box: "padding" | "margin",
  side: Side
): string => {
  const longhand = styles[`${box}-${side}`];

  if (longhand) {
    return toTidy(longhand);
  }

  return toTidy(toBoxSides(styles[box] ?? null)[side]);
};

const toStyleValues = (styles: Record<string, string>): StyleValues => {
  const values = {} as StyleValues;

  for (const prop of DIRECT_STYLE_PROPERTIES) {
    values[prop] = toTidy(styles[prop] ?? null);
  }

  for (const side of SIDES) {
    values[`padding-${side}`] = toBoxValue(styles, "padding", side);
    values[`margin-${side}`] = toBoxValue(styles, "margin", side);
  }

  return values;
};

const hasChildElements = (outerHTML: string): boolean => {
  const close = outerHTML.indexOf(">");

  if (close === -1) {
    return false;
  }

  return ELEMENT_OPEN_RE.test(outerHTML.slice(close + 1));
};

const toTextEditability = (selection: SelectionContext): TextEditability => {
  if (hasChildElements(selection.outerHTML)) {
    return "children";
  }

  if (selection.text.length >= MAX_TEXT) {
    return "long";
  }

  return "ok";
};

const toChangedProps = (
  values: Partial<StyleValues>,
  base: StyleValues
): Partial<StyleValues> => {
  const out: Partial<StyleValues> = {};

  for (const [prop, value] of Object.entries(values) as [
    DirectStyleProperty,
    string,
  ][]) {
    if (value !== base[prop]) {
      out[prop] = value;
    }
  }

  return out;
};

export {
  SIDES,
  hasChildElements,
  isValidColor,
  toBoxSides,
  toChangedProps,
  toDisplayColor,
  toHexColor,
  toNormalizedLength,
  toNumberText,
  toParsedNumber,
  toShiftedPart,
  toShiftedValue,
  toSteppedValue,
  toStyleValues,
  toTextEditability,
};

export type { Shift, ShiftPart, Side, StyleValues };
