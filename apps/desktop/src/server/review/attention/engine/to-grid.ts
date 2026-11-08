import type { AttentionGrid, AttentionImage } from "./types.js";

interface FeatureGrids {
  readonly blueYellow: AttentionGrid;
  readonly luminance: AttentionGrid;
  readonly redGreen: AttentionGrid;
}

const GRID_COLUMNS = 64;

const CHANNELS = 4;

const CHANNEL_MAX = 255;

const RED_WEIGHT = 0.2126;

const GREEN_WEIGHT = 0.7152;

const BLUE_WEIGHT = 0.0722;

const HALF = 0.5;

const toRowCount = (image: AttentionImage): number =>
  Math.max(1, Math.ceil((image.height * GRID_COLUMNS) / image.width));

const toFeatureGrids = (image: AttentionImage): FeatureGrids => {
  const cell = image.width / GRID_COLUMNS;
  const rows = toRowCount(image);
  const size = GRID_COLUMNS * rows;
  const luminance = new Float64Array(size);
  const redGreen = new Float64Array(size);
  const blueYellow = new Float64Array(size);
  const counts = new Float64Array(size);

  for (let y = 0; y < image.height; y += 1) {
    const row = Math.min(rows - 1, Math.floor(y / cell));

    for (let x = 0; x < image.width; x += 1) {
      const col = Math.min(GRID_COLUMNS - 1, Math.floor(x / cell));
      const at = (y * image.width + x) * CHANNELS;
      const red = (image.rgba[at] ?? 0) / CHANNEL_MAX;
      const green = (image.rgba[at + 1] ?? 0) / CHANNEL_MAX;
      const blue = (image.rgba[at + 2] ?? 0) / CHANNEL_MAX;
      const index = row * GRID_COLUMNS + col;

      luminance[index] =
        (luminance[index] ?? 0) +
        RED_WEIGHT * red +
        GREEN_WEIGHT * green +
        BLUE_WEIGHT * blue;
      redGreen[index] = (redGreen[index] ?? 0) + (red - green);
      blueYellow[index] =
        (blueYellow[index] ?? 0) + (blue - (red + green) * HALF);
      counts[index] = (counts[index] ?? 0) + 1;
    }
  }

  const cols = GRID_COLUMNS;

  const average = (values: Float64Array): AttentionGrid => ({
    cell,
    cols,
    rows,
    values: values.map(
      (value, index) => value / Math.max(1, counts[index] ?? 1)
    ),
  });

  return {
    blueYellow: average(blueYellow),
    luminance: average(luminance),
    redGreen: average(redGreen),
  };
};

export { GRID_COLUMNS, toFeatureGrids };

export type { FeatureGrids };
