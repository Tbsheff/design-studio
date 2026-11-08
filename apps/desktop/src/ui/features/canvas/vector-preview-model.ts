import type { PenAnchor } from "./drawing-model.js";
import type { Point } from "./vector-layer-types.js";

const PREVIEW_STROKE = 1.5;

const toRubberPath = (
  last: PenAnchor | undefined,
  hover: Point | null,
  toPath: (anchors: PenAnchor[]) => string
): string => {
  if (last && hover) {
    return toPath([last, hover]);
  }

  return "";
};

const toAnchorClass = (index: number, closing: boolean): string => {
  if (index === 0 && closing) {
    return "anchor closing";
  }

  return "anchor";
};

export { PREVIEW_STROKE, toAnchorClass, toRubberPath };
