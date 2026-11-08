import { toContrastRatio } from "./to-contrast-ratio.js";
import type {
  AttentionBox,
  AttentionElement,
  AttentionGrid,
  AttentionRgb,
} from "./types.js";

interface PriorMap {
  readonly owners: Int32Array;
  readonly priors: Float64Array;
}

const WHITE: AttentionRgb = { blue: 255, green: 255, red: 255 };

const BACKGROUND_PRIOR = 0.15;

const AREA_BASE = 0.6;

const AREA_RANGE = 1.4;

const AREA_SCALE = 3;

const CONTRAST_BASE = 0.7;

const CONTRAST_RANGE = 0.6;

const CONTRAST_FULL = 7;

const SIZE_REFERENCE = 16;

const SIZE_MIN = 0.75;

const SIZE_MAX = 3;

const SIZE_POWER = 0.7;

const WEIGHT_REFERENCE = 400;

const WEIGHT_STEP = 1000;

const WEIGHT_MIN = 100;

const WEIGHT_MAX = 900;

const INTERACTIVE_FACTOR = 1.2;

const HALF = 0.5;

const toFigureRatio = (element: AttentionElement): number => {
  const backdrop = element.backdrop ?? WHITE;

  if (element.background !== null) {
    return toContrastRatio(element.background, backdrop);
  }

  if (element.textLength > 0 && element.color !== null) {
    return toContrastRatio(element.color, backdrop);
  }

  return 1;
};

const toAreaRatio = (
  box: AttentionBox,
  width: number,
  height: number
): number => (box.width * box.height) / (width * height);

const toTypeFactor = (element: AttentionElement): number => {
  if (element.textLength === 0) {
    return 1;
  }

  const size = Math.min(
    SIZE_MAX,
    Math.max(SIZE_MIN, element.fontSize / SIZE_REFERENCE)
  );

  const weight = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, element.fontWeight));

  return size ** SIZE_POWER * (1 + (weight - WEIGHT_REFERENCE) / WEIGHT_STEP);
};

const toElementPrior = (
  element: AttentionElement,
  width: number,
  height: number
): number => {
  const area = toAreaRatio(element.box, width, height);

  const areaFactor =
    AREA_BASE + AREA_RANGE * Math.min(1, Math.sqrt(area) * AREA_SCALE);

  const contrastFactor =
    CONTRAST_BASE +
    CONTRAST_RANGE * Math.min(1, toFigureRatio(element) / CONTRAST_FULL);

  let interactive = 1;

  if (element.isInteractive) {
    interactive = INTERACTIVE_FACTOR;
  }

  return areaFactor * contrastFactor * toTypeFactor(element) * interactive;
};

const isInside = (box: AttentionBox, x: number, y: number): boolean =>
  x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;

const toPaintOrder = (
  elements: readonly AttentionElement[]
): { readonly element: AttentionElement; readonly index: number }[] =>
  elements
    .map((element, index) => ({ element, index }))
    .toSorted(
      (left, right) =>
        right.element.box.width * right.element.box.height -
          left.element.box.width * left.element.box.height ||
        left.index - right.index
    );

const applyPaint = (
  grid: AttentionGrid,
  map: PriorMap,
  paint: {
    readonly index: number;
    readonly prior: number;
    readonly box: AttentionBox;
  }
): void => {
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const at = row * grid.cols + col;

      if (
        isInside(paint.box, (col + HALF) * grid.cell, (row + HALF) * grid.cell)
      ) {
        map.priors[at] = paint.prior;
        map.owners[at] = paint.index;
      }
    }
  }
};

const toPriorMap = (
  grid: AttentionGrid,
  elements: readonly AttentionElement[],
  pixels: { readonly height: number; readonly width: number }
): PriorMap => {
  const size = grid.cols * grid.rows;

  const map: PriorMap = {
    owners: new Int32Array(size).fill(-1),
    priors: new Float64Array(size).fill(BACKGROUND_PRIOR),
  };

  for (const { element, index } of toPaintOrder(elements)) {
    const prior = toElementPrior(element, pixels.width, pixels.height);

    applyPaint(grid, map, { box: element.box, index, prior });
  }

  return map;
};

export { isInside, toAreaRatio, toFigureRatio, toPriorMap };

export type { PriorMap };
