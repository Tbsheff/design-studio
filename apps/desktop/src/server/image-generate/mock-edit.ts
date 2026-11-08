import { PNG } from "pngjs";

import type { EditMode } from "./edit-mode.js";

interface MockEdited {
  readonly bytes: Buffer | null;
  readonly message: string | null;
}

type Rgb = readonly [number, number, number];

const CHANNELS = 4;

const RGB_COUNT = 3;

const ALPHA = 3;

const SCALE = 2;

const SIDE_MAX = 4096;

const CUT_DISTANCE = 56;

const TINT_SHARE = 0.4;

const BYTE_MAX = 255;

const HUE_SPAN = 360;

const SECTOR = 60;

const DEFAULT_SIDE = 512;

const HASH_SEED = 7;

const HASH_MULTIPLIER = 31;

const HASH_MODULUS = 100_003;

const LIGHTNESS = 0.55;

const SATURATION = 0.7;

const WIDTH_PATTERN = /\bwidth="(?<value>\d+)"/gu;

const HEIGHT_PATTERN = /\bheight="(?<value>\d+)"/gu;

const STOP_PATTERN = /stop-color="hsl\((?<hue>\d+)/gu;

const ONLY_PNG = "The mock provider edits PNG and SVG images only.";

const TOO_LARGE = "The image is already large. Upscale a smaller image.";

const toRgb = (hue: number): Rgb => {
  const chroma = (1 - Math.abs(2 * LIGHTNESS - 1)) * SATURATION;
  const sector = (((hue % HUE_SPAN) + HUE_SPAN) % HUE_SPAN) / SECTOR;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const base = LIGHTNESS - chroma / 2;

  const table: readonly Rgb[] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ];

  const row = table[Math.floor(sector) % table.length] ?? [0, 0, 0];

  return [
    Math.round((row[0] + base) * BYTE_MAX),
    Math.round((row[1] + base) * BYTE_MAX),
    Math.round((row[2] + base) * BYTE_MAX),
  ];
};

const toHue = (text: string): number => {
  let hash = HASH_SEED;

  for (const char of text) {
    hash = (hash * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) % HASH_MODULUS;
  }

  return hash % HUE_SPAN;
};

const toSideOf = (text: string, pattern: RegExp): number => {
  const found = [...text.matchAll(pattern)][0]?.groups?.value;

  return Number(found ?? DEFAULT_SIDE);
};

const toStopHues = (text: string): readonly [number, number] => {
  const found = [...text.matchAll(STOP_PATTERN)].map((match) =>
    Number(match.groups?.hue)
  );

  const first = found[0] ?? toHue(text);

  return [first, found.at(-1) ?? first + SECTOR];
};

const toGradientPng = (source: Buffer): PNG => {
  const text = source.toString("utf-8");
  const width = toSideOf(text, WIDTH_PATTERN);
  const height = toSideOf(text, HEIGHT_PATTERN);
  const [from, to] = toStopHues(text);
  const start = toRgb(from);
  const end = toRgb(to);
  const png = new PNG({ height, width });
  const span = Math.max(1, width + height - SCALE);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const share = (column + row) / span;
      const at = (row * width + column) * CHANNELS;

      for (let channel = 0; channel < RGB_COUNT; channel += 1) {
        png.data[at + channel] = Math.round(
          (start[channel] ?? 0) * (1 - share) + (end[channel] ?? 0) * share
        );
      }

      png.data[at + ALPHA] = BYTE_MAX;
    }
  }

  return png;
};

const toSourcePng = (source: Buffer, ext: string): PNG | null => {
  if (ext === "svg") {
    return toGradientPng(source);
  }

  if (ext === "png") {
    return PNG.sync.read(source);
  }

  return null;
};

const toDistance = (png: PNG, at: number, corner: Rgb): number =>
  Math.hypot(
    (png.data[at] ?? 0) - corner[0],
    (png.data[at + 1] ?? 0) - corner[1],
    (png.data[at + 2] ?? 0) - corner[2]
  );

const toCutPng = (png: PNG): PNG => {
  const corner: Rgb = [png.data[0] ?? 0, png.data[1] ?? 0, png.data[2] ?? 0];

  const out = new PNG({ height: png.height, width: png.width });

  png.data.copy(out.data);

  for (let at = 0; at < out.data.length; at += CHANNELS) {
    if (toDistance(png, at, corner) <= CUT_DISTANCE) {
      out.data[at + ALPHA] = 0;
    }
  }

  return out;
};

const toScaledPng = (png: PNG): PNG => {
  const width = png.width * SCALE;
  const height = png.height * SCALE;
  const out = new PNG({ height, width });

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const from =
        (Math.floor(row / SCALE) * png.width + Math.floor(column / SCALE)) *
        CHANNELS;

      png.data.copy(
        out.data,
        (row * width + column) * CHANNELS,
        from,
        from + CHANNELS
      );
    }
  }

  return out;
};

const toTintedPng = (png: PNG, prompt: string): PNG => {
  const color = toRgb(toHue(prompt));
  const out = new PNG({ height: png.height, width: png.width });

  png.data.copy(out.data);

  for (let at = 0; at < out.data.length; at += CHANNELS) {
    for (let channel = 0; channel < RGB_COUNT; channel += 1) {
      out.data[at + channel] = Math.round(
        (png.data[at + channel] ?? 0) * (1 - TINT_SHARE) +
          (color[channel] ?? 0) * TINT_SHARE
      );
    }
  }

  return out;
};

const toEditedPng = (png: PNG, mode: EditMode, prompt: string): PNG => {
  if (mode === "remove-background") {
    return toCutPng(png);
  }

  if (mode === "upscale") {
    return toScaledPng(png);
  }

  return toTintedPng(png, prompt);
};

const toMockEdit = (
  source: Buffer,
  ext: string,
  mode: EditMode,
  prompt: string
): MockEdited => {
  const png = toSourcePng(source, ext);

  if (png === null) {
    return { bytes: null, message: ONLY_PNG };
  }

  if (
    mode === "upscale" &&
    Math.max(png.width, png.height) * SCALE > SIDE_MAX
  ) {
    return { bytes: null, message: TOO_LARGE };
  }

  return {
    bytes: PNG.sync.write(toEditedPng(png, mode, prompt)),
    message: null,
  };
};

export { toMockEdit };

export type { MockEdited };
