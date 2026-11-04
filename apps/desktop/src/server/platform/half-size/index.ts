import { PNG } from "pngjs";

const CHANNELS = 4;
const SCALE = 2;

const OFFSETS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

const averageSample = (
  png: PNG,
  column: number,
  row: number,
  channel: number
): number => {
  let sum = 0;

  for (const [dx, dy] of OFFSETS) {
    const sx = Math.min(png.width - 1, column * SCALE + dx);
    const sy = Math.min(png.height - 1, row * SCALE + dy);

    sum += png.data[(sy * png.width + sx) * CHANNELS + channel] ?? 0;
  }

  return Math.round(sum / OFFSETS.length);
};

const halfSize = (source: Buffer): Buffer => {
  const png = PNG.sync.read(source);
  const width = Math.max(1, Math.floor(png.width / SCALE));
  const height = Math.max(1, Math.floor(png.height / SCALE));
  const out = new PNG({ height, width });

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        out.data[(row * width + column) * CHANNELS + channel] = averageSample(
          png,
          column,
          row,
          channel
        );
      }
    }
  }

  return PNG.sync.write(out);
};

export { halfSize };
