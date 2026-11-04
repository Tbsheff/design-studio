import type { CSSProperties } from "react";

import { copy } from "./copy.js";
import type {
  SelectionContext,
  TextStyle,
  TextStyleTargetBody,
} from "./deps.js";

interface CurrentStyle {
  label: string;
  name: string | null;
}

const ROOT_PX = 16;
const CLASS_ATTR = /^<[^>]*?\sclass(?:Name)?="(?<list>[^"]*)"/u;
const PX = /^(?<num>-?[\d.]+)px$/u;
const REM = /^(?<num>-?[\d.]+)rem$/u;
const NUMERIC = /^\d+$/u;
const PREVIEW_MAX_PX = 28;
const PREVIEW_MIN_PX = 10;

const classesOf = (selection: SelectionContext): Set<string> => {
  const list = CLASS_ATTR.exec(selection.outerHTML)?.groups?.["list"] ?? "";

  return new Set(list.split(/\s+/u).filter(Boolean));
};

const pxOf = (value: string | null | undefined): number | null => {
  const text = value?.trim() ?? "";
  const px = PX.exec(text)?.groups?.["num"];

  if (px) {
    return Number(px);
  }

  const rem = REM.exec(text)?.groups?.["num"];

  if (rem) {
    return Number(rem) * ROOT_PX;
  }

  return null;
};

const numericWeight = (style: TextStyle): string | null => {
  if (style.weight && NUMERIC.test(style.weight)) {
    return style.weight;
  }

  return null;
};

const sameWeight = (style: TextStyle, selection: SelectionContext): boolean => {
  const weight = numericWeight(style);

  return weight === null || weight === selection.styles["font-weight"];
};

const valueMatch = (style: TextStyle, selection: SelectionContext): boolean => {
  const want = pxOf(style.size);
  const have = pxOf(selection.styles["font-size"]);

  return want !== null && want === have && sameWeight(style, selection);
};

const styleOf = (
  styles: TextStyle[],
  selection: SelectionContext
): string | null => {
  const classes = classesOf(selection);
  const byClass = styles.find((style) => classes.has(`text-${style.name}`));

  if (byClass) {
    return byClass.name;
  }

  return styles.find((style) => valueMatch(style, selection))?.name ?? null;
};

const currentStyle = (
  styles: TextStyle[],
  targets: SelectionContext[]
): CurrentStyle => {
  const names = new Set(targets.map((target) => styleOf(styles, target)));

  if (names.size > 1) {
    return { label: copy.mixed, name: null };
  }

  const [name = null] = names;

  return { label: name ?? copy.none, name };
};

const previewLook = (style: TextStyle): CSSProperties => {
  const look: CSSProperties = {};
  const px = pxOf(style.size);
  const weight = numericWeight(style);

  if (px !== null) {
    look.fontSize = `${Math.min(PREVIEW_MAX_PX, Math.max(PREVIEW_MIN_PX, px))}px`;
  }

  if (weight !== null) {
    look.fontWeight = weight;
  }

  return look;
};

const metaOf = (style: TextStyle): string =>
  [style.size, style.weight].filter(Boolean).join(" · ");

const targetBody = (
  selection: SelectionContext
): TextStyleTargetBody | null => {
  if (!selection.source) {
    return null;
  }

  return {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };
};

export { currentStyle, metaOf, previewLook, targetBody };

export type { CurrentStyle };
