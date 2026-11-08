interface RasterImage {
  readonly data: ArrayLike<number>;
  readonly height: number;
  readonly width: number;
}

interface PaletteSwatch {
  readonly hex: string;
  readonly share: number;
}

type Pixel = readonly [number, number, number];

const SAMPLE_SIDE = 64;

const PALETTE_SIZE = 8;

const CHANNELS = 4;

const ALPHA_MIN = 128;

const BYTE_MAX = 255;

const HEX_RADIX = 16;

const HEX_WIDTH = 2;

const SHARE_DIGITS = 1000;

const RED = 0;

const GREEN = 1;

const BLUE = 2;

const ALPHA = 3;

const HALF = 2;

const toDownsample = (image: RasterImage): Pixel[] => {
  const scale = Math.min(1, SAMPLE_SIDE / Math.max(image.width, image.height));
  const outWidth = Math.max(1, Math.round(image.width * scale));
  const outHeight = Math.max(1, Math.round(image.height * scale));
  const pixels: Pixel[] = [];

  for (let row = 0; row < outHeight; row += 1) {
    const sourceRow = Math.floor((row * image.height) / outHeight);

    for (let column = 0; column < outWidth; column += 1) {
      const sourceColumn = Math.floor((column * image.width) / outWidth);
      const offset = (sourceRow * image.width + sourceColumn) * CHANNELS;
      const alpha = image.data[offset + ALPHA] ?? 0;

      if (alpha >= ALPHA_MIN) {
        pixels.push([
          image.data[offset + RED] ?? 0,
          image.data[offset + GREEN] ?? 0,
          image.data[offset + BLUE] ?? 0,
        ]);
      }
    }
  }

  return pixels;
};

const toRange = (pixels: readonly Pixel[], channel: number): number => {
  const values = pixels.map((pixel) => pixel[channel] ?? 0);

  return Math.max(...values) - Math.min(...values);
};

const toWidestChannel = (pixels: readonly Pixel[]): number => {
  const ranges = [RED, GREEN, BLUE].map((channel) => toRange(pixels, channel));
  const widest = Math.max(...ranges);

  return ranges.indexOf(widest);
};

const toVolume = (pixels: readonly Pixel[]): number => {
  if (pixels.length < HALF) {
    return 0;
  }

  return (
    Math.max(
      toRange(pixels, RED),
      toRange(pixels, GREEN),
      toRange(pixels, BLUE)
    ) * pixels.length
  );
};

const toSplit = (pixels: readonly Pixel[]): readonly [Pixel[], Pixel[]] => {
  const channel = toWidestChannel(pixels);

  const sorted = pixels.toSorted(
    (left, right) => (left[channel] ?? 0) - (right[channel] ?? 0)
  );

  const middle = Math.floor(sorted.length / HALF);

  return [sorted.slice(0, middle), sorted.slice(middle)];
};

const toBiggestIndex = (boxes: readonly (readonly Pixel[])[]): number => {
  const volumes = boxes.map((box) => toVolume(box));

  return volumes.indexOf(Math.max(...volumes));
};

const toBoxes = (pixels: Pixel[], size: number): Pixel[][] => {
  let boxes: Pixel[][] = [pixels];

  while (boxes.length < size) {
    const index = toBiggestIndex(boxes);
    const biggest = boxes[index] ?? [];

    if (toVolume(biggest) === 0) {
      break;
    }

    const [low, high] = toSplit(biggest);

    boxes = [
      ...boxes.slice(0, index),
      low,
      high,
      ...boxes.slice(index + 1),
    ].filter((box) => box.length > 0);
  }

  return boxes;
};

const toHexPart = (value: number): string =>
  Math.min(BYTE_MAX, Math.max(0, Math.round(value)))
    .toString(HEX_RADIX)
    .padStart(HEX_WIDTH, "0");

const toAverageHex = (pixels: readonly Pixel[]): string => {
  const sum = (channel: number): number =>
    pixels.reduce((total, pixel) => total + (pixel[channel] ?? 0), 0) /
    pixels.length;

  return `#${toHexPart(sum(RED))}${toHexPart(sum(GREEN))}${toHexPart(sum(BLUE))}`;
};

const toPalette = (
  image: RasterImage,
  size: number = PALETTE_SIZE
): PaletteSwatch[] => {
  const pixels = toDownsample(image);

  if (pixels.length === 0) {
    return [];
  }

  const merged = new Map<string, number>();

  for (const box of toBoxes(pixels, size)) {
    const hex = toAverageHex(box);

    merged.set(hex, (merged.get(hex) ?? 0) + box.length);
  }

  return [...merged.entries()]
    .map(([hex, count]) => ({
      hex,
      share: Math.round((count / pixels.length) * SHARE_DIGITS) / SHARE_DIGITS,
    }))
    .toSorted((left, right) => right.share - left.share);
};

export { toPalette };

export type { PaletteSwatch, RasterImage };
