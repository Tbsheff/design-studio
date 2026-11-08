import { DIRECT_STYLE_PROPERTIES } from "@design-studio/contracts";
import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";

type StyleValues = Record<DirectStyleProperty, string>;

const SIDES = ["top", "right", "bottom", "left"] as const;

type Side = (typeof SIDES)[number];

const NUMBER_RE = /^(-?\d*\.?\d+)\s*(px|rem|em|%)?$/i;

const RGB_RE =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_TEXT = 300;

interface ParsedNumber {
  readonly value: number;
  readonly unit: string;
}

const parseNumber = (raw: string): ParsedNumber | null => {
  const match = NUMBER_RE.exec(raw.trim());

  if (!match) {
    return null;
  }

  return { unit: (match[2] ?? "").toLowerCase(), value: Number(match[1]) };
};

const round = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const formatNumber = (value: number, unit: string): string => {
  return `${round(value)}${unit}`;
};

const stepValue = (
  raw: string,
  delta: number,
  fallbackUnit: string
): string => {
  const parsed = parseNumber(raw) ?? { unit: fallbackUnit, value: 0 };

  return formatNumber(parsed.value + delta, parsed.unit || fallbackUnit);
};

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

const shiftedPart = (raw: string, part: ShiftPart, shift: Shift): string => {
  return part.map(raw, (value) => {
    const from = part.set ?? value;
    const next = shift.delta === 0 ? from : (shiftedValue(from, shift) ?? from);
    const parsed = parseNumber(next);

    return parsed && parsed.unit === "" && parsed.value !== 0
      ? formatNumber(parsed.value, "px")
      : next;
  });
};

const shiftedValue = (raw: string, shift: Shift): string | null => {
  const parsed = parseNumber(raw);

  if (!parsed) {
    return null;
  }

  const next = Math.min(
    shift.max ?? Infinity,
    Math.max(shift.min ?? -Infinity, parsed.value + shift.delta)
  );

  return formatNumber(next, parsed.unit);
};

const normalizeLength = (raw: string, defaultUnit: string): string => {
  const trimmed = raw.trim();
  const parsed = parseNumber(trimmed);

  if (!parsed || parsed.unit !== "" || defaultUnit === "") {
    return trimmed;
  }

  return formatNumber(parsed.value, defaultUnit);
};

const hexByte = (value: number): string => {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
};

const alphaOf = (raw: string | undefined): number => {
  if (raw === undefined) {
    return 1;
  }

  return raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
};

const colorToHex = (raw: string): string | null => {
  const value = raw.trim();

  if (HEX_RE.test(value)) {
    const body = value.slice(1);

    return body.length === 3
      ? `#${[...body].map((item) => item + item).join("")}`.toLowerCase()
      : value.toLowerCase();
  }

  const match = RGB_RE.exec(value);

  if (!match || alphaOf(match[4]) < 1) {
    return null;
  }

  return `#${hexByte(Number(match[1]))}${hexByte(Number(match[2]))}${hexByte(Number(match[3]))}`;
};

const TRANSPARENT_RE = /^rgba\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*0\s*\)$/i;

const displayColor = (raw: string): string => {
  if (TRANSPARENT_RE.test(raw.trim())) {
    return "transparent";
  }

  return colorToHex(raw) ?? raw.trim();
};

const isValidColor = (raw: string): boolean => {
  const value = raw.trim();

  if (value === "") {
    return false;
  }

  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return true;
  }

  return CSS.supports("color", value);
};

const expandBox = (raw: string | undefined): Record<Side, string> => {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  const [top = "", right = top, bottom = top, left = right] = parts;

  return { bottom, left, right, top };
};

const boxValue = (
  styles: Record<string, string>,
  box: "padding" | "margin",
  side: Side
): string => {
  const longhand = styles[`${box}-${side}`];

  if (longhand !== undefined && longhand !== "") {
    return tidy(longhand);
  }

  return tidy(expandBox(styles[box])[side]);
};

const tidy = (raw: string | undefined): string => {
  const value = (raw ?? "").trim();
  const parsed = parseNumber(value);

  return parsed ? formatNumber(parsed.value, parsed.unit) : value;
};

const valuesFromStyles = (styles: Record<string, string>): StyleValues => {
  const values = {} as StyleValues;

  for (const prop of DIRECT_STYLE_PROPERTIES) {
    values[prop] = tidy(styles[prop]);
  }

  for (const side of SIDES) {
    values[`padding-${side}`] = boxValue(styles, "padding", side);
    values[`margin-${side}`] = boxValue(styles, "margin", side);
  }

  return values;
};

const hasChildElements = (outerHTML: string): boolean => {
  const close = outerHTML.indexOf(">");

  if (close === -1) {
    return false;
  }

  return /<[a-zA-Z]/.test(outerHTML.slice(close + 1));
};

type TextEditability = "ok" | "children" | "long";

const textEditability = (selection: SelectionContext): TextEditability => {
  if (hasChildElements(selection.outerHTML)) {
    return "children";
  }

  if (selection.text.length >= MAX_TEXT) {
    return "long";
  }

  return "ok";
};

const changedProps = (
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
  parseNumber,
  formatNumber,
  stepValue,
  shiftedPart,
  shiftedValue,
  normalizeLength,
  colorToHex,
  displayColor,
  isValidColor,
  expandBox,
  valuesFromStyles,
  hasChildElements,
  textEditability,
  changedProps,
};
export type { StyleValues, Side, Shift, ShiftPart };
