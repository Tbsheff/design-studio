import type { LayoutPadding } from "./engine/index.js";
import type { LayoutStyle } from "./layer-layout-files.js";

const CLEAR_SIDES = {
  "padding-bottom": null,
  "padding-left": null,
  "padding-right": null,
  "padding-top": null,
} as const;

const toPx = (value: number): string => `${value}px`;

const toPaddingText = (padding: LayoutPadding | null): string | null => {
  if (padding === null) {
    return null;
  }

  const { bottom, left, right, top } = padding;

  if (top === bottom && left === right && top === left) {
    return toPx(top);
  }

  if (top === bottom && left === right) {
    return `${toPx(top)} ${toPx(right)}`;
  }

  if (left === right) {
    return `${toPx(top)} ${toPx(right)} ${toPx(bottom)}`;
  }

  return `${toPx(top)} ${toPx(right)} ${toPx(bottom)} ${toPx(left)}`;
};

const toPaddingStyle = (
  padding: LayoutPadding | null,
  isTailwind: boolean
): LayoutStyle => {
  const text = toPaddingText(padding);

  if (padding === null || text === null) {
    return {};
  }

  if (isTailwind) {
    return {
      "padding-bottom": toPx(padding.bottom),
      "padding-left": toPx(padding.left),
      "padding-right": toPx(padding.right),
      "padding-top": toPx(padding.top),
    };
  }

  return { ...CLEAR_SIDES, padding: text };
};

export { toPaddingStyle, toPaddingText };
