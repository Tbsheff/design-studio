import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";

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

const readShot = async (shot: SheetShot): Promise<PNG> =>
  PNG.sync.read(await readFile(shot.file));

const composeSheet = async (
  shots: readonly SheetShot[],
  outPath: string
): Promise<string> => {
  const pngs = await Promise.all(shots.map((shot) => readShot(shot)));
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

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, PNG.sync.write(sheet));

  return outPath;
};

const removeShot = async (shot: SheetShot): Promise<void> => {
  try {
    await rm(shot.file, { force: true });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
};

const removeShots = async (shots: readonly SheetShot[]): Promise<void> => {
  await Promise.all(shots.map((shot) => removeShot(shot)));
};

export { composeSheet, removeShots };

export type { SheetShot };
