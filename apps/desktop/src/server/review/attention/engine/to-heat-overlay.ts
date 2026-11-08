import type { AttentionGrid, AttentionImage } from "./types.js";

const OVERLAY_WIDTH = 480;

const CHANNELS = 4;

const ALPHA_MAX = 0.7;

const ALPHA_POWER = 0.8;

const OPAQUE = 255;

const HALF = 0.5;

const RAMP: readonly (readonly number[])[] = [
  "24 60 220",
  "0 190 220",
  "60 210 90",
  "250 220 40",
  "240 40 30",
].map((stops) => stops.split(" ").map(Number));

const RGB_CHANNELS = 3;

const toRampColor = (heat: number): readonly number[] => {
  const scaled = heat * (RAMP.length - 1);
  const low = Math.min(RAMP.length - 2, Math.floor(scaled));
  const mix = scaled - low;
  const from = RAMP[low] ?? [];
  const to = RAMP[low + 1] ?? from;

  return from.map(
    (start, channel) => start + ((to[channel] ?? start) - start) * mix
  );
};

const toHeatAt = (grid: AttentionGrid, x: number, y: number): number => {
  const gx = Math.min(grid.cols - 1, Math.max(0, x / grid.cell - HALF));
  const gy = Math.min(grid.rows - 1, Math.max(0, y / grid.cell - HALF));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(grid.cols - 1, x0 + 1);
  const y1 = Math.min(grid.rows - 1, y0 + 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const at = (col: number, row: number): number =>
    grid.values[row * grid.cols + col] ?? 0;

  const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx;
  const bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx;

  return top * (1 - fy) + bottom * fy;
};

const toHeatOverlay = (
  image: AttentionImage,
  grid: AttentionGrid
): AttentionImage => {
  const width = Math.min(OVERLAY_WIDTH, image.width);
  const factor = image.width / width;
  const height = Math.max(1, Math.round(image.height / factor));
  const rgba = new Uint8Array(width * height * CHANNELS);
  let peak = 0;

  for (const value of grid.values) {
    peak = Math.max(peak, value);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(image.width - 1, Math.floor((x + HALF) * factor));
      const sy = Math.min(image.height - 1, Math.floor((y + HALF) * factor));
      const source = (sy * image.width + sx) * CHANNELS;

      const heat = Math.min(
        1,
        toHeatAt(grid, (x + HALF) * factor, (y + HALF) * factor) /
          Math.max(peak, Number.EPSILON)
      );

      const alpha = ALPHA_MAX * heat ** ALPHA_POWER;
      const color = toRampColor(heat);
      const target = (y * width + x) * CHANNELS;

      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        const base = image.rgba[source + channel] ?? 0;

        rgba[target + channel] = Math.round(
          base * (1 - alpha) + (color[channel] ?? 0) * alpha
        );
      }

      rgba[target + RGB_CHANNELS] = OPAQUE;
    }
  }

  return { height, rgba, width };
};

export { toHeatOverlay };
