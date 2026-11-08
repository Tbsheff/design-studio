import type { SelectionContext } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";
import type { CSSProperties } from "react";

import type { BooleanOpName, VectorPaint } from "../../../shared/vector.js";

interface VectorProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEditable: boolean;
}

interface PaintValues {
  readonly fill: string;
  readonly stroke: string;
  readonly width: string;
}

interface BooleanGlyphSpec {
  readonly first: string;
  readonly hasCut: boolean;
  readonly hasOverlay: boolean;
  readonly isFirstFilled: boolean;
  readonly isSecondFilled: boolean;
  readonly second: string;
  readonly secondOpacity: number;
}

type SavedPaint = Partial<Record<keyof PaintValues, string>>;

const DRAWING_TAG =
  /<(?:path|rect|circle|ellipse|polygon|polyline|line)\b[^>]*>/iu;

const GLYPH_FIRST = "M2.5 2.5h7v7h-7z";
const GLYPH_SECOND = "M6.5 6.5h7v7h-7z";
const GLYPH_OPACITY = 0.35;
const NO_OPACITY = 0;
const NO_PAINT = "none";
const DEFAULT_HEX = "#ffffff";

const BOOLEAN_LABEL: Record<BooleanOpName, string> = {
  exclude: "Exclude",
  intersect: "Intersect",
  subtract: "Subtract",
  union: "Union",
};

const BOOLEAN_TIP: Record<BooleanOpName, string> = {
  exclude: "Exclude: keep only where they do not overlap",
  intersect: "Intersect: keep only where they overlap",
  subtract: "Subtract: cut the second shape out of the first",
  union: "Union: join the two shapes into one path",
};

const BOOLEAN_GLYPH: Record<BooleanOpName, BooleanGlyphSpec> = {
  exclude: {
    first: GLYPH_FIRST,
    hasCut: false,
    hasOverlay: true,
    isFirstFilled: true,
    isSecondFilled: true,
    second: GLYPH_SECOND,
    secondOpacity: GLYPH_OPACITY,
  },
  intersect: {
    first: GLYPH_FIRST,
    hasCut: true,
    hasOverlay: false,
    isFirstFilled: false,
    isSecondFilled: false,
    second: GLYPH_SECOND,
    secondOpacity: GLYPH_OPACITY,
  },
  subtract: {
    first: GLYPH_FIRST,
    hasCut: false,
    hasOverlay: false,
    isFirstFilled: true,
    isSecondFilled: false,
    second: GLYPH_SECOND,
    secondOpacity: NO_OPACITY,
  },
  union: {
    first: GLYPH_FIRST,
    hasCut: false,
    hasOverlay: false,
    isFirstFilled: true,
    isSecondFilled: true,
    second: GLYPH_SECOND,
    secondOpacity: GLYPH_OPACITY,
  },
};

const toAttr = (tag: string, name: string): string | null => {
  const attr =
    new RegExp(`\\s${name}="(?<value>[^"]*)"`, "iu").exec(tag)?.groups?.value ??
    null;

  if (attr !== null) {
    return attr;
  }

  const style = /\sstyle="(?<value>[^"]*)"/iu.exec(tag)?.groups?.value ?? "";

  return (
    new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*(?<value>[^;]+)`, "iu")
      .exec(style)
      ?.groups?.value?.trim() ?? null
  );
};

const toPaint = (selection: SelectionContext): PaintValues => {
  const html = selection.outerHTML;
  const own = /^<[^>]*>/u.exec(html)?.[0] ?? "";
  let drawing = own;

  if (selection.tag.toLowerCase() === "svg") {
    drawing = DRAWING_TAG.exec(html.slice(own.length))?.[0] ?? own;
  }

  const pick = (name: string): string =>
    toAttr(drawing, name) ?? toAttr(own, name) ?? "";

  return {
    fill: pick("fill"),
    stroke: pick("stroke"),
    width: pick("stroke-width"),
  };
};

const toInsertTarget = (selection: SelectionContext): InsertTarget => ({
  selector: selection.selector,
  source: selection.source,
  tag: selection.tag.toLowerCase(),
});

const toSavedPaint = (change: VectorPaint): SavedPaint => {
  const saved: SavedPaint = {};

  if ("fill" in change) {
    saved.fill = change.fill ?? NO_PAINT;
  }

  if ("stroke" in change) {
    saved.stroke = change.stroke ?? NO_PAINT;
  }

  if ("strokeWidth" in change) {
    saved.width = String(change.strokeWidth ?? "");
  }

  return saved;
};

const isPainted = (value: string): boolean =>
  value !== "" && value !== NO_PAINT;

const isValidPaint = (raw: string, pattern: RegExp): boolean =>
  raw.trim() === "" || pattern.test(raw.trim());

const toShownColor = (value: string): string => {
  if (/^#[0-9a-f]+$/iu.test(value)) {
    return value.toLowerCase();
  }

  return value || NO_PAINT;
};

const toPaintValue = (next: string): string | null => {
  if (next === "" || next === NO_PAINT) {
    return null;
  }

  return next;
};

const toSwatchColor = (value: string): string => {
  if (isPainted(value)) {
    return value;
  }

  return "transparent";
};

const toSwatchClass = (value: string): string => {
  if (isPainted(value)) {
    return "ins-swatch";
  }

  return "ins-swatch empty";
};

const toSwatchStyle = (value: string): CSSProperties => ({
  ["--swatch" as string]: toSwatchColor(value),
});

const toFillPaint = (isFilled: boolean): string => {
  if (isFilled) {
    return "currentColor";
  }

  return NO_PAINT;
};

const toOnlySelection = (
  selection: SelectionContext[]
): SelectionContext | null => {
  if (selection.length === 1) {
    return selection[0] ?? null;
  }

  return null;
};

export type { PaintValues, SavedPaint, VectorProps };

export {
  BOOLEAN_GLYPH,
  BOOLEAN_LABEL,
  BOOLEAN_TIP,
  DEFAULT_HEX,
  GLYPH_OPACITY,
  isPainted,
  isValidPaint,
  toFillPaint,
  toInsertTarget,
  toOnlySelection,
  toPaint,
  toPaintValue,
  toSavedPaint,
  toShownColor,
  toSwatchClass,
  toSwatchStyle,
};
