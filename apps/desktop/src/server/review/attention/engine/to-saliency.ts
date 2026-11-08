import type { FeatureGrids } from "./to-grid.js";
import type { AttentionGrid } from "./types.js";

const NEAR_SMALL = 1;

const FAR_SMALL = 4;

const NEAR_LARGE = 2;

const FAR_LARGE = 6;

const SCALES: readonly (readonly [number, number])[] = [
  [NEAR_SMALL, FAR_SMALL],
  [NEAR_LARGE, FAR_LARGE],
];

const LUMINANCE_WEIGHT = 1;

const OPPONENT_WEIGHT = 0.8;

const GLOBAL_WEIGHT = 0.5;

const toBoxMean = (
  grid: AttentionGrid,
  col: number,
  row: number,
  radius: number
): number => {
  let total = 0;
  let count = 0;

  for (
    let y = Math.max(0, row - radius);
    y <= Math.min(grid.rows - 1, row + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, col - radius);
      x <= Math.min(grid.cols - 1, col + radius);
      x += 1
    ) {
      total += grid.values[y * grid.cols + x] ?? 0;
      count += 1;
    }
  }

  return total / Math.max(1, count);
};

const toGridMean = (grid: AttentionGrid): number => {
  let total = 0;

  for (const value of grid.values) {
    total += value;
  }

  return total / Math.max(1, grid.values.length);
};

const toChannelSaliency = (
  grid: AttentionGrid,
  weight: number
): Float64Array => {
  const out = new Float64Array(grid.values.length);

  const mean = toGridMean(grid);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const index = row * grid.cols + col;
      let sum = GLOBAL_WEIGHT * Math.abs((grid.values[index] ?? 0) - mean);

      for (const [near, far] of SCALES) {
        sum += Math.abs(
          toBoxMean(grid, col, row, near) - toBoxMean(grid, col, row, far)
        );
      }

      out[index] = sum * weight;
    }
  }

  return out;
};

const toSaliency = (features: FeatureGrids): AttentionGrid => {
  const { luminance } = features;

  const parts = [
    toChannelSaliency(luminance, LUMINANCE_WEIGHT),
    toChannelSaliency(features.redGreen, OPPONENT_WEIGHT),
    toChannelSaliency(features.blueYellow, OPPONENT_WEIGHT),
  ];

  const values = new Float64Array(luminance.values.length);

  for (const part of parts) {
    for (const [index, value] of part.entries()) {
      values[index] = (values[index] ?? 0) + value;
    }
  }

  return { ...luminance, values };
};

export { toSaliency };
