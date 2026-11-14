import type { SelectionContext } from "@design-studio/contracts";

import { isBigResizeStep } from "../../../shared/resize-step.js";
import type { ResizeStep } from "../../../shared/resize-step.js";
import { sizeKeysCopy } from "./copy.js";
import { toParsedNumber, toStyleValues } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";
import { toScaleStep } from "./edit-keys-model.js";
import { toMultiBlockReason } from "./mixed-values-model.js";
import { toParentLayout, toSizeFacts, toSizePatch } from "./sizing-model.js";
import type { Axis } from "./sizing-model.js";

interface SizeItem {
  readonly height: number;
  readonly isHeightChanged: boolean;
  readonly isWidthChanged: boolean;
  readonly target: SelectionContext;
  readonly width: number;
}

interface SizeBurst {
  readonly items: readonly SizeItem[];
  readonly key: string;
}

const SPACING_SCALE_PX = {
  "0": 0,
  "0.5": 2,
  "1": 4,
  "1.5": 6,
  "10": 40,
  "11": 44,
  "12": 48,
  "14": 56,
  "16": 64,
  "2": 8,
  "2.5": 10,
  "20": 80,
  "24": 96,
  "28": 112,
  "3": 12,
  "3.5": 14,
  "32": 128,
  "36": 144,
  "4": 16,
  "40": 160,
  "44": 176,
  "48": 192,
  "5": 20,
  "52": 208,
  "56": 224,
  "6": 24,
  "60": 240,
  "64": 256,
  "7": 28,
  "72": 288,
  "8": 32,
  "80": 320,
  "9": 36,
  "96": 384,
};

const SPACING_SCALE: readonly number[] = Object.values(
  SPACING_SCALE_PX
).toSorted((left, right) => left - right);

const BIG_SCALE_STEP = 4;
const ROOT_TAGS = new Set(["body", "html"]);
const CLASS_RE = /^<[^>]*?\sclass="(?<names>[^"]*)"/u;
const VARIANT_RE = /^(?:[\w[\]&:.@/-]+:)?/u;

const AXIS_PREFIXES: Record<Axis, readonly string[]> = {
  height: ["h-", "size-"],
  width: ["w-", "size-"],
};

const isFrameRoot = (target: SelectionContext): boolean =>
  ROOT_TAGS.has(target.tag.toLowerCase()) ||
  (target.ancestors.length <= 1 && target.rect.x <= 0 && target.rect.y <= 0);

const toSizeBlock = (selection: SelectionContext[]): string | null => {
  if (selection.some((target) => isFrameRoot(target))) {
    return sizeKeysCopy.frameRoot;
  }

  if (selection.length === 1) {
    if (selection[0]?.source) {
      return null;
    }

    return sizeKeysCopy.noSource;
  }

  return toMultiBlockReason(selection);
};

const toClassNames = (target: SelectionContext): readonly string[] => {
  const names = CLASS_RE.exec(target.outerHTML)?.groups?.names ?? "";

  return names.split(/\s+/u).filter(Boolean);
};

const isScaleAxis = (target: SelectionContext, axis: Axis): boolean =>
  toClassNames(target).some((name) => {
    const bare = name.replace(VARIANT_RE, "");

    return AXIS_PREFIXES[axis].some((prefix) => bare.startsWith(prefix));
  });

const toMeasuredPx = (target: SelectionContext, axis: Axis): number => {
  const own = toParsedNumber(target.styles[axis] ?? "");

  if (own && own.unit === "px") {
    return own.value;
  }

  return toParsedNumber(target.styles[`used-${axis}`] ?? "")?.value ?? 0;
};

const toSizeItem = (selected: SelectionContext): SizeItem => ({
  height: Math.round(toMeasuredPx(selected, "height")),
  isHeightChanged: false,
  isWidthChanged: false,
  target: selected,
  width: Math.round(toMeasuredPx(selected, "width")),
});

const toScaleSteps = (delta: number, isBig: boolean): number => {
  if (isBig) {
    return Math.sign(delta) * BIG_SCALE_STEP;
  }

  return Math.sign(delta);
};

const toSteppedPx = (
  px: number,
  delta: number,
  isBig: boolean,
  isScale: boolean
): number => {
  if (isScale) {
    const next = toScaleStep(SPACING_SCALE, px, toScaleSteps(delta, isBig));

    if (next !== null) {
      return next;
    }
  }

  return Math.max(0, px + delta);
};

const toNextItem = (item: SizeItem, step: ResizeStep): SizeItem => {
  const isBig = isBigResizeStep(step);
  const { target } = item;

  if (step.dw !== 0) {
    const isScale = isScaleAxis(target, "width");
    const width = toSteppedPx(item.width, step.dw, isBig, isScale);

    return { ...item, isWidthChanged: true, width };
  }

  const isScale = isScaleAxis(target, "height");
  const height = toSteppedPx(item.height, step.dh, isBig, isScale);

  return { ...item, height, isHeightChanged: true };
};

const toAxisPatch = (
  target: SelectionContext,
  axis: Axis,
  px: number
): Partial<StyleValues> =>
  toSizePatch(
    axis,
    "fixed",
    {
      parent: toParentLayout(target.styles),
      usedPx: `${px}px`,
      values: toStyleValues(target.styles),
    },
    toSizeFacts(target.styles)
  );

const toSizeStyle = (item: SizeItem): Partial<StyleValues> => {
  let style: Partial<StyleValues> = {};

  if (item.isWidthChanged) {
    style = { ...style, ...toAxisPatch(item.target, "width", item.width) };
  }

  if (item.isHeightChanged) {
    style = { ...style, ...toAxisPatch(item.target, "height", item.height) };
  }

  return style;
};

const toBackStyle = (
  item: SizeItem,
  style: Partial<StyleValues>
): Record<string, string> =>
  Object.fromEntries(
    Object.keys(style).map((key) => [key, item.target.styles[key] ?? ""])
  );

const isSizeChanged = (item: SizeItem): boolean =>
  item.isWidthChanged || item.isHeightChanged;

export {
  isSizeChanged,
  toBackStyle,
  toNextItem,
  toSizeBlock,
  toSizeItem,
  toSizeStyle,
};

export type { SizeBurst, SizeItem };
