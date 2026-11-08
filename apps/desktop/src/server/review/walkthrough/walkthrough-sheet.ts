import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import type { Outcome } from "./engine/index.js";

interface Rect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface Size {
  readonly height: number;
  readonly width: number;
}

const THUMB_WIDTH = 360;

const GAP = 16;

const BAR = 8;

const MAX_COLUMNS = 4;

const CHANNELS = 4;

const BACKDROP = 238;

const ALPHA = 255;

const GREEN = "#22a05a";

const AMBER = "#e0a01e";

const RED = "#d64040";

const BLUE = "#5a6edc";

const HEX_RADIX = 16;

type Color = readonly [number, number, number];

const RED_AT = 1;

const GREEN_AT = 3;

const BLUE_AT = 5;

const HEX_PAIR = 2;

const toChannel = (hex: string, at: number): number =>
  Number.parseInt(hex.slice(at, at + HEX_PAIR), HEX_RADIX);

const toColor = (hex: string): Color => [
  toChannel(hex, RED_AT),
  toChannel(hex, GREEN_AT),
  toChannel(hex, BLUE_AT),
];

const OUTCOME_COLORS: Readonly<Record<Outcome, string>> = {
  done: GREEN,
  "max-steps": AMBER,
  stuck: RED,
};

const toIndexes = (count: number): number[] =>
  Array.from({ length: count }, (_unused, position) => position);

const setPixel = (
  png: PNG,
  point: { readonly left: number; readonly top: number },
  color: Color
): void => {
  const at = (point.top * png.width + point.left) * CHANNELS;
  const [red, green, blue] = color;

  png.data[at] = red;
  png.data[at + 1] = green;
  png.data[at + 2] = blue;
  png.data[at + CHANNELS - 1] = ALPHA;
};

const setRect = (png: PNG, rect: Rect, color: Color): void => {
  for (const row of toIndexes(rect.height)) {
    for (const column of toIndexes(rect.width)) {
      setPixel(png, { left: rect.left + column, top: rect.top + row }, color);
    }
  }
};

const toSample = (source: PNG, left: number, top: number): Color => {
  const at = (top * source.width + left) * CHANNELS;

  return [
    source.data[at] ?? BACKDROP,
    source.data[at + 1] ?? BACKDROP,
    source.data[at + 2] ?? BACKDROP,
  ];
};

const toThumbHeight = (source: PNG): number =>
  Math.max(1, Math.round((source.height * THUMB_WIDTH) / source.width));

const setThumb = (
  sheet: PNG,
  source: PNG,
  origin: { readonly left: number; readonly top: number }
): void => {
  const size: Size = { height: toThumbHeight(source), width: THUMB_WIDTH };

  for (const row of toIndexes(size.height)) {
    for (const column of toIndexes(size.width)) {
      const left = Math.floor((column * source.width) / size.width);
      const top = Math.floor((row * source.height) / size.height);

      setPixel(
        sheet,
        { left: origin.left + column, top: origin.top + row },
        toSample(
          source,
          Math.min(source.width - 1, left),
          Math.min(source.height - 1, top)
        )
      );
    }
  }
};

const toBarColor = (isLast: boolean, outcome: Outcome): Color => {
  if (isLast) {
    return toColor(OUTCOME_COLORS[outcome]);
  }

  return toColor(BLUE);
};

const createContactSheet = async (
  files: readonly string[],
  outcome: Outcome,
  target: string
): Promise<void> => {
  const shots = await Promise.all(
    files.map(async (file) => PNG.sync.read(await readFile(file)))
  );

  const columns = Math.min(MAX_COLUMNS, Math.max(1, shots.length));
  const rows = Math.ceil(shots.length / columns);
  const cell = Math.max(...shots.map((shot) => toThumbHeight(shot)));
  const sheetWidth = GAP + columns * (THUMB_WIDTH + GAP);
  const sheetHeight = GAP + rows * (BAR + cell + GAP);
  const sheet = new PNG({ height: sheetHeight, width: sheetWidth });

  setRect(sheet, { height: sheetHeight, left: 0, top: 0, width: sheetWidth }, [
    BACKDROP,
    BACKDROP,
    BACKDROP,
  ]);

  for (const [index, shot] of shots.entries()) {
    const cellLeft = GAP + (index % columns) * (THUMB_WIDTH + GAP);
    const cellTop = GAP + Math.floor(index / columns) * (BAR + cell + GAP);
    const color = toBarColor(index === shots.length - 1, outcome);

    setRect(
      sheet,
      { height: BAR, left: cellLeft, top: cellTop, width: THUMB_WIDTH },
      color
    );
    setThumb(sheet, shot, { left: cellLeft, top: cellTop + BAR });
  }

  await writeFile(target, PNG.sync.write(sheet));
};

export { createContactSheet };
