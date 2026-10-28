import { PNG } from 'pngjs';

export function halfSize(source: Buffer): Buffer {
  const png = PNG.sync.read(source);
  const width = Math.max(1, Math.floor(png.width / 2));
  const height = Math.max(1, Math.floor(png.height / 2));
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let sum = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          const sx = Math.min(png.width - 1, x * 2 + dx);
          const sy = Math.min(png.height - 1, y * 2 + dy);
          sum += png.data[(sy * png.width + sx) * 4 + channel] ?? 0;
        }
        out.data[(y * width + x) * 4 + channel] = Math.round(sum / 4);
      }
    }
  }
  return PNG.sync.write(out);
}
