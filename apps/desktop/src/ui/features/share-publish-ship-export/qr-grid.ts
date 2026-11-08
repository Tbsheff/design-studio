import { BASE, BYTE_BITS, toBit, toDivided, toXor } from "./qr-bits.js";
import { TIMING_INDEX } from "./qr-spec.js";
import type { QrVersionSpec } from "./qr-spec.js";

interface QrGrid {
  readonly size: number;
  readonly dark: boolean[][];
  readonly fixed: boolean[][];
}

interface QrPoint {
  readonly column: number;
  readonly row: number;
}

const FINDER_RADIUS = 4;
const FINDER_CENTER = 3;
const VERSION_MIN = 7;
const VERSION_DEGREE = 12;
const VERSION_BITS = 18;
const VERSION_COLUMNS = 3;
const VERSION_OFFSET = 11;
const VERSION_GENERATOR = 7973;
const FORMAT_DEGREE = 10;
const FORMAT_BITS = 15;
const FORMAT_GENERATOR = 1335;
const FORMAT_MASK = 21_522;
const FORMAT_EDGE = 8;
const FORMAT_FIRST_RUN = 6;
const FORMAT_SIDE = 7;
const FORMAT_LAST = 14;
const FORMAT_LOW_BYTE = 8;
const FORMAT_FROM_END = 15;

const toRows = (size: number): boolean[][] =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => false));

const toGrid = (spec: QrVersionSpec): QrGrid => ({
  dark: toRows(spec.size),
  fixed: toRows(spec.size),
  size: spec.size,
});

const setFixed = (grid: QrGrid, point: QrPoint, isDark: boolean): void => {
  const row = grid.dark[point.row];
  const fixedRow = grid.fixed[point.row];

  if (!row || !fixedRow || point.column < 0 || point.column >= grid.size) {
    return;
  }

  row[point.column] = isDark;
  fixedRow[point.column] = true;
};

const toDistance = (deltaColumn: number, deltaRow: number): number =>
  Math.max(Math.abs(deltaColumn), Math.abs(deltaRow));

const drawFinder = (grid: QrGrid, center: QrPoint): void => {
  for (
    let deltaRow = -FINDER_RADIUS;
    deltaRow <= FINDER_RADIUS;
    deltaRow += 1
  ) {
    for (
      let deltaColumn = -FINDER_RADIUS;
      deltaColumn <= FINDER_RADIUS;
      deltaColumn += 1
    ) {
      const distance = toDistance(deltaColumn, deltaRow);
      setFixed(
        grid,
        { column: center.column + deltaColumn, row: center.row + deltaRow },
        distance !== 2 && distance !== FINDER_RADIUS
      );
    }
  }
};

const drawAlignment = (grid: QrGrid, center: QrPoint): void => {
  for (let deltaRow = -2; deltaRow <= 2; deltaRow += 1) {
    for (let deltaColumn = -2; deltaColumn <= 2; deltaColumn += 1) {
      setFixed(
        grid,
        { column: center.column + deltaColumn, row: center.row + deltaRow },
        toDistance(deltaColumn, deltaRow) !== 1
      );
    }
  }
};

const toAlignmentPoints = (spec: QrVersionSpec): readonly QrPoint[] => {
  const last = spec.centers.length - 1;
  const points: QrPoint[] = [];

  for (const [rowIndex, row] of spec.centers.entries()) {
    for (const [columnIndex, column] of spec.centers.entries()) {
      const isFinderCorner =
        [0, last].includes(rowIndex) &&
        [0, last].includes(columnIndex) &&
        rowIndex + columnIndex !== last * 2;

      if (!isFinderCorner) {
        points.push({ column, row });
      }
    }
  }

  return points;
};

const drawPatterns = (grid: QrGrid, spec: QrVersionSpec): void => {
  for (let index = 0; index < grid.size; index += 1) {
    const isEven = index % 2 === 0;
    setFixed(grid, { column: TIMING_INDEX, row: index }, isEven);
    setFixed(grid, { column: index, row: TIMING_INDEX }, isEven);
  }

  const far = grid.size - 1 - FINDER_CENTER;
  drawFinder(grid, { column: FINDER_CENTER, row: FINDER_CENTER });
  drawFinder(grid, { column: far, row: FINDER_CENTER });
  drawFinder(grid, { column: FINDER_CENTER, row: far });

  for (const point of toAlignmentPoints(spec)) {
    drawAlignment(grid, point);
  }
};

const drawVersion = (grid: QrGrid, version: number): void => {
  if (version < VERSION_MIN) {
    return;
  }

  const remainder = toDivided(version, VERSION_GENERATOR, VERSION_DEGREE);
  const bits = version * BASE ** VERSION_DEGREE + remainder;

  for (let index = 0; index < VERSION_BITS; index += 1) {
    const near = grid.size - VERSION_OFFSET + (index % VERSION_COLUMNS);
    const along = Math.floor(index / VERSION_COLUMNS);
    const isDark = toBit(bits, index) === 1;
    setFixed(grid, { column: near, row: along }, isDark);
    setFixed(grid, { column: along, row: near }, isDark);
  }
};

const toFirstFormatPoint = (index: number): QrPoint => {
  if (index < FORMAT_FIRST_RUN) {
    return { column: FORMAT_EDGE, row: index };
  }

  if (index === FORMAT_FIRST_RUN) {
    return { column: FORMAT_EDGE, row: FORMAT_SIDE };
  }

  if (index === FORMAT_SIDE) {
    return { column: FORMAT_EDGE, row: FORMAT_EDGE };
  }

  if (index === FORMAT_LOW_BYTE) {
    return { column: FORMAT_SIDE, row: FORMAT_EDGE };
  }

  return { column: FORMAT_LAST - index, row: FORMAT_EDGE };
};

const toSecondFormatPoint = (size: number, index: number): QrPoint => {
  if (index < FORMAT_LOW_BYTE) {
    return { column: size - 1 - index, row: FORMAT_EDGE };
  }

  return { column: FORMAT_EDGE, row: size - FORMAT_FROM_END + index };
};

const drawFormat = (grid: QrGrid, mask: number): void => {
  const remainder = toDivided(mask, FORMAT_GENERATOR, FORMAT_DEGREE);
  const bits = toXor(mask * BASE ** FORMAT_DEGREE + remainder, FORMAT_MASK);

  for (let index = 0; index < FORMAT_BITS; index += 1) {
    const isDark = toBit(bits, index) === 1;
    setFixed(grid, toFirstFormatPoint(index), isDark);
    setFixed(grid, toSecondFormatPoint(grid.size, index), isDark);
  }

  setFixed(grid, { column: FORMAT_EDGE, row: grid.size - FORMAT_EDGE }, true);
};

const toColumnPoints = (grid: QrGrid, right: number): readonly QrPoint[] => {
  const isUpward = toBit(right + 1, 1) === 0;
  const points: QrPoint[] = [];

  for (let vertical = 0; vertical < grid.size; vertical += 1) {
    let row = vertical;

    if (isUpward) {
      row = grid.size - 1 - vertical;
    }

    for (const column of [right, right - 1]) {
      if (grid.fixed[row]?.[column] === false) {
        points.push({ column, row });
      }
    }
  }

  return points;
};

const toDataPoints = (grid: QrGrid): readonly QrPoint[] => {
  const points: QrPoint[] = [];

  for (let pair = 0; pair < Math.floor(grid.size / 2); pair += 1) {
    let right = grid.size - 1 - pair * 2;

    if (right <= TIMING_INDEX) {
      right -= 1;
    }

    points.push(...toColumnPoints(grid, right));
  }

  return points;
};

const drawCodewords = (grid: QrGrid, codewords: readonly number[]): void => {
  for (const [index, point] of toDataPoints(grid).entries()) {
    const byte = codewords[Math.floor(index / BYTE_BITS)] ?? 0;
    const row = grid.dark[point.row];

    if (row) {
      row[point.column] =
        toBit(byte, BYTE_BITS - 1 - (index % BYTE_BITS)) === 1;
    }
  }
};

export { drawCodewords, drawFormat, drawPatterns, drawVersion, toGrid };

export type { QrGrid };
