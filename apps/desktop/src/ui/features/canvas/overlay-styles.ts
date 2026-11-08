import type { CSSProperties } from "react";

import type { MeasureLine } from "../../../shared/measure.js";
import type { SnapGuide, SpacingBadge } from "./snap-model.js";

const guideStyle = (snapGuide: SnapGuide): CSSProperties => {
  if (snapGuide.axis === "x") {
    return {
      height: snapGuide.to - snapGuide.from,
      left: snapGuide.at,
      top: snapGuide.from,
    };
  }

  return {
    left: snapGuide.from,
    top: snapGuide.at,
    width: snapGuide.to - snapGuide.from,
  };
};

const fullStyle = (
  snapGuideValue: SnapGuide
):
  | { bottom: number; left: number; top: number; right?: undefined }
  | { left: number; right: number; top: number; bottom?: undefined } => {
  if (snapGuideValue.axis === "x") {
    return { bottom: 0, left: snapGuideValue.at, top: 0 };
  }

  return { left: 0, right: 0, top: snapGuideValue.at };
};

const lineStyle = (measureLine: MeasureLine): CSSProperties => {
  if (measureLine.axis === "x") {
    return {
      left: measureLine.from,
      top: measureLine.at,
      width: measureLine.to - measureLine.from,
    };
  }

  return {
    height: measureLine.to - measureLine.from,
    left: measureLine.at,
    top: measureLine.from,
  };
};

const gapStyle = (spacingBadge: SpacingBadge): CSSProperties => {
  if (spacingBadge.axis === "x") {
    return {
      left: spacingBadge.from,
      top: spacingBadge.at,
      width: spacingBadge.to - spacingBadge.from,
    };
  }

  return {
    height: spacingBadge.to - spacingBadge.from,
    left: spacingBadge.at,
    top: spacingBadge.from,
  };
};

interface RectLike {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const toRectStyle = (
  rect: RectLike,
  size: { height: number; width: number } | null
): CSSProperties => {
  const { height, width } = size ?? rect;

  const { x: left, y: top } = rect;

  return { height, left, top, width };
};

const toSnapOriginStyle = (
  origin: { x: number; y: number },
  shift: { x: number; y: number }
): CSSProperties => ({
  left: -origin.x,
  top: -origin.y,
  translate: `${shift.x}px ${shift.y}px`,
});

export {
  gapStyle,
  toSnapOriginStyle,
  toRectStyle,
  fullStyle,
  guideStyle,
  lineStyle,
};
