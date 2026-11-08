import { isInside } from "./to-priors.js";
import type { PriorMap } from "./to-priors.js";
import type { AttentionBox, AttentionGrid } from "./types.js";

const BIAS_STRENGTH = 0.3;

const HORIZONTAL_SHARE = 0.65;

const VERTICAL_SHARE = 0.35;

const HALF = 0.5;

const toReadingBias = (
  grid: AttentionGrid,
  col: number,
  row: number
): number => {
  const across = (col + HALF) / grid.cols;
  const down = (row + HALF) / grid.rows;

  return (
    1 +
    BIAS_STRENGTH * (1 - (HORIZONTAL_SHARE * across + VERTICAL_SHARE * down))
  );
};

const toAttentionCells = (
  saliency: AttentionGrid,
  priors: PriorMap,
  scope: AttentionBox | null
): AttentionGrid => {
  const values = new Float64Array(saliency.values.length);

  for (let row = 0; row < saliency.rows; row += 1) {
    for (let col = 0; col < saliency.cols; col += 1) {
      const index = row * saliency.cols + col;
      const x = (col + HALF) * saliency.cell;
      const y = (row + HALF) * saliency.cell;
      const isScoped = scope === null || isInside(scope, x, y);

      if (isScoped) {
        values[index] =
          (saliency.values[index] ?? 0) *
          (priors.priors[index] ?? 0) *
          toReadingBias(saliency, col, row);
      }
    }
  }

  return { ...saliency, values };
};

export { toAttentionCells };
