import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";
import { PNG } from "pngjs";

import { attemptKnown } from "./deps.js";
import type { KnownFailure } from "./deps.js";

interface SheetShot {
  readonly file: string;
  readonly row: number;
}

interface PasteTarget {
  readonly column: number;
  readonly line: number;
  readonly scale: number;
}

const THUMB_HEIGHT = 360;

const SHEET_GAP = 12;

const BACKGROUND = 229;

const OPAQUE = 255;

const CHANNELS = 4;

const scaleOf = (shot: PNG): number => Math.min(1, THUMB_HEIGHT / shot.height);

const thumbWidth = (shot: PNG): number =>
  Math.max(1, Math.floor(shot.width * scaleOf(shot)));

const fill = (sheet: PNG): void => {
  sheet.data.fill(BACKGROUND);

  for (let at = CHANNELS - 1; at < sheet.data.length; at += CHANNELS) {
    sheet.data[at] = OPAQUE;
  }
};

const paste = (sheet: PNG, shot: PNG, target: PasteTarget): void => {
  const { column, line, scale } = target;
  const width = thumbWidth(shot);
  const height = Math.max(1, Math.floor(shot.height * scale));

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const from =
        (Math.floor(row / scale) * shot.width + Math.floor(col / scale)) *
        CHANNELS;

      const to = ((line + row) * sheet.width + column + col) * CHANNELS;

      for (let channel = 0; channel < CHANNELS; channel += 1) {
        sheet.data[to + channel] = shot.data[from + channel] ?? OPAQUE;
      }
    }
  }
};

const widthOf = (shots: readonly PNG[]): number =>
  shots.reduce((sum, shot) => sum + thumbWidth(shot) + SHEET_GAP, SHEET_GAP);

const readShot = (shot: SheetShot): Effect.Effect<PNG, KnownFailure> =>
  attemptKnown(() => readFile(shot.file)).pipe(
    Effect.map((bytes) => PNG.sync.read(bytes))
  );

const toSheet = (shots: readonly SheetShot[], pngs: readonly PNG[]): PNG => {
  const rows = Math.max(...shots.map((shot) => shot.row)) + 1;

  const perRow = Array.from({ length: rows }, (_row, index) =>
    pngs.filter((_png, at) => shots[at]?.row === index)
  );

  const sheet = new PNG({
    height: rows * (THUMB_HEIGHT + SHEET_GAP) + SHEET_GAP,
    width: Math.max(...perRow.map((row) => widthOf(row))),
  });

  fill(sheet);

  for (const [index, row] of perRow.entries()) {
    let column = SHEET_GAP;
    const line = SHEET_GAP + index * (THUMB_HEIGHT + SHEET_GAP);

    for (const shot of row) {
      paste(sheet, shot, { column, line, scale: scaleOf(shot) });
      column += thumbWidth(shot) + SHEET_GAP;
    }
  }

  return sheet;
};

const composeSheet = Effect.fn("composeSheet")(function* run(
  shots: readonly SheetShot[],
  outPath: string
) {
  const pngs = yield* Effect.all(shots.map((shot) => readShot(shot)));
  const sheet = toSheet(shots, pngs);

  yield* attemptKnown(() => mkdir(path.dirname(outPath), { recursive: true }));
  yield* attemptKnown(() => writeFile(outPath, PNG.sync.write(sheet)));

  return outPath;
});

const removeShots = (shots: readonly SheetShot[]): Effect.Effect<void> =>
  Effect.all(
    shots.map((shot) =>
      attemptKnown(() => rm(shot.file, { force: true })).pipe(Effect.ignore)
    ),
    { discard: true }
  );

export { composeSheet, removeShots };

export type { SheetShot };
