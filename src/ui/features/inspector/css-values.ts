import { DIRECT_STYLE_PROPERTIES } from "../../../shared/contracts.js";
import type {
  DirectEditRequest,
  DirectStyleProperty,
  SelectionContext,
  TextSourceHints,
} from "../../../shared/contracts.js";
import type { ApiError } from "../../api.js";
import { errorText } from "../../api.js";
import { isApiConflict, isApiError } from "./api-error.js";
import { editVariantStore } from "./edit-variant.js";
import type { DirectEdit } from "./use-direct-edit.js";

export type StyleValues = Record<DirectStyleProperty, string>;

export const SIDES = ["top", "right", "bottom", "left"] as const;

export type Side = (typeof SIDES)[number];

const NUMBER_RE = /^(-?\d*\.?\d+)\s*(px|rem|em|%)?$/iu;

const RGB_RE =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/iu;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu;
const MAX_TEXT = 300;

interface ParsedNumber {
  value: number;
  unit: string;
}

export const parseNumber = (raw: string): ParsedNumber | null => {
  const match = NUMBER_RE.exec(raw.trim());

  if (!match) {
    return null;
  }

  return { unit: (match[2] ?? "").toLowerCase(), value: Number(match[1]) };
};

const round = (value: number): number => Math.round(value * 100) / 100;

export const formatNumber = (value: number, unit: string): string =>
  `${round(value)}${unit}`;

export const stepValue = (
  raw: string,
  delta: number,
  fallbackUnit: string
): string => {
  const parsed = parseNumber(raw) ?? { unit: fallbackUnit, value: 0 };

  return formatNumber(parsed.value + delta, parsed.unit || fallbackUnit);
};

export interface Shift {
  delta: number;
  min?: number;
  max?: number;
}

export interface ShiftPart {
  key: string;
  map: (raw: string, change: (value: string) => string) => string;
  set?: string;
}

export const shiftedPart = (
  raw: string,
  part: ShiftPart,
  shift: Shift
): string =>
  part.map(raw, (value) => {
    const from = part.set ?? value;
    const next = shift.delta === 0 ? from : (shiftedValue(from, shift) ?? from);
    const parsed = parseNumber(next);

    return parsed && parsed.unit === "" && parsed.value !== 0
      ? formatNumber(parsed.value, "px")
      : next;
  });

export const shiftedValue = (raw: string, shift: Shift): string | null => {
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

export const normalizeLength = (raw: string, defaultUnit: string): string => {
  const trimmed = raw.trim();
  const parsed = parseNumber(trimmed);

  if (!parsed || parsed.unit !== "" || defaultUnit === "") {
    return trimmed;
  }

  return formatNumber(parsed.value, defaultUnit);
};

const hexByte = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");

const alphaOf = (raw: string | undefined): number => {
  if (raw === undefined) {
    return 1;
  }

  return raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
};

export const colorToHex = (raw: string): string | null => {
  const value = raw.trim();

  if (HEX_RE.test(value)) {
    const body = value.slice(1);

    return body.length === 3
      ? `#${[...body].map((c) => c + c).join("")}`.toLowerCase()
      : value.toLowerCase();
  }

  const match = RGB_RE.exec(value);

  if (!match || alphaOf(match[4]) < 1) {
    return null;
  }

  return `#${hexByte(Number(match[1]))}${hexByte(Number(match[2]))}${hexByte(Number(match[3]))}`;
};

const TRANSPARENT_RE = /^rgba\(\s*0[\s,]+0[\s,]+0\s*[,/]\s*0\s*\)$/iu;

export const displayColor = (raw: string): string => {
  if (TRANSPARENT_RE.test(raw.trim())) {
    return "transparent";
  }

  return colorToHex(raw) ?? raw.trim();
};

export const isValidColor = (raw: string): boolean => {
  const value = raw.trim();

  if (value === "") {
    return false;
  }

  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return true;
  }

  return CSS.supports("color", value);
};

export const expandBox = (raw: string | undefined): Record<Side, string> => {
  const parts = (raw ?? "").trim().split(/\s+/u).filter(Boolean);
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

export const valuesFromStyles = (
  styles: Record<string, string>
): StyleValues => {
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

export const hasChildElements = (outerHTML: string): boolean => {
  const close = outerHTML.indexOf(">");

  if (close === -1) {
    return false;
  }

  return /<[a-zA-Z]/u.test(outerHTML.slice(close + 1));
};

type TextEditability = "ok" | "children" | "long";

export const textEditability = (
  selection: SelectionContext
): TextEditability => {
  if (hasChildElements(selection.outerHTML)) {
    return "children";
  }

  if (selection.text.length >= MAX_TEXT) {
    return "long";
  }

  return "ok";
};

export const changedProps = (
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

export const declaredOf = (
  styles: Record<string, string>,
  style: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(style).flatMap(([key, value]) =>
      `declared-${key}` in styles ? [[`declared-${key}`, value]] : []
    )
  );

export const NO_MIXED: ReadonlySet<DirectStyleProperty> = new Set();

type EditValues = Pick<DirectEdit, "values" | "mixed" | "preview" | "commit">;

export const sameEditValues = (
  a: EditValues,
  b: EditValues,
  props: readonly DirectStyleProperty[]
): boolean => {
  if (a === b) {
    return true;
  }

  if (a.preview !== b.preview || a.commit !== b.commit) {
    return false;
  }

  return props.every(
    (prop) =>
      a.values[prop] === b.values[prop] &&
      a.mixed.has(prop) === b.mixed.has(prop)
  );
};

export const DEBOUNCE_MS = 250;
const AGENT_RUNNING_MESSAGE = "Agent is running. Wait or cancel.";

export const isStaleSelection = (err: unknown): err is ApiError =>
  isApiError(err) && err.status === 422 && err.code === "stale_selection";

export const failureText = (err: unknown): string => {
  if (isApiConflict(err)) {
    return AGENT_RUNNING_MESSAGE;
  }

  return errorText(err);
};

export const textHints = (selection: SelectionContext): TextSourceHints => ({
  text: selection.text,
  ...(selection.usedAt ? { usedAt: selection.usedAt } : {}),
  ...(selection.owners?.length ? { owners: selection.owners } : {}),
});

export const buildEditRequest = (
  selection: SelectionContext,
  style: Partial<StyleValues>,
  text?: string,
  editVariant = editVariantStore.get()
): DirectEditRequest | null => {
  const { source } = selection;

  if (!source) {
    return null;
  }

  const hasStyle = Object.keys(style).length > 0;

  if (!hasStyle && text === undefined) {
    return null;
  }

  const wire = Object.fromEntries(
    Object.entries(style).map(([prop, value]) => [
      prop,
      value.trim() === "" ? null : value.trim(),
    ])
  );

  const target = selection.component
    ? { component: selection.component }
    : { tag: selection.tag.toLowerCase() };

  const variant = hasStyle ? editVariant : "";

  return {
    selector: selection.selector,
    source,
    ...target,
    ...(hasStyle ? { style: wire } : {}),
    ...(text === undefined ? {} : { hints: textHints(selection), text }),
    ...(variant ? { variant } : {}),
  };
};
