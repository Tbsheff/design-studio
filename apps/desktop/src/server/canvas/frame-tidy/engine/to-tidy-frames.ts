import { CANVAS_MAX_COORD } from "@design-studio/contracts/canvas-file";

type TidyLayout = "tidy" | "row" | "grid";

interface TidyBox {
  readonly height: number;
  readonly id: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface TidyPoint {
  readonly x: number;
  readonly y: number;
}

interface TidyPlace {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

interface TidyArea {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const SECTION_PAD_SIDE = 48;

const SECTION_PAD_TOP = 64;

const toClamped = (value: number): number =>
  Math.max(-CANVAS_MAX_COORD, Math.min(CANVAS_MAX_COORD, Math.round(value)));

const toByTop = (left: TidyBox, right: TidyBox): number =>
  left.y - right.y || left.x - right.x;

const toByLeft = (left: TidyBox, right: TidyBox): number =>
  left.x - right.x || left.y - right.y;

const toRows = (boxes: readonly TidyBox[]): TidyBox[][] => {
  const rows: TidyBox[][] = [];
  let bottom = Number.NEGATIVE_INFINITY;

  for (const box of boxes.toSorted(toByTop)) {
    const row = rows.at(-1);

    if (row && box.y < bottom) {
      row.push(box);
      bottom = Math.max(bottom, box.y + box.height);
    } else {
      rows.push([box]);
      bottom = box.y + box.height;
    }
  }

  return rows.map((row) => row.toSorted(toByLeft));
};

const toChunks = (boxes: readonly TidyBox[], columns: number): TidyBox[][] => {
  const rows: TidyBox[][] = [];

  for (let index = 0; index < boxes.length; index += columns) {
    rows.push(boxes.slice(index, index + columns));
  }

  return rows;
};

const toColumnWidths = (rows: readonly TidyBox[][]): number[] => {
  const widths: number[] = [];

  for (const row of rows) {
    for (const [column, box] of row.entries()) {
      widths[column] = Math.max(widths[column] ?? 0, box.width);
    }
  }

  return widths;
};

const toRowHeight = (row: readonly TidyBox[]): number =>
  Math.max(0, ...row.map((box) => box.height));

const toSpan = (sides: readonly number[], gap: number): number =>
  sides.reduce((sum, side) => sum + side, 0) +
  gap * Math.max(0, sides.length - 1);

const toSquareMiss = (rows: readonly TidyBox[][], gap: number): number => {
  const heights = rows.map((row) => toRowHeight(row));
  const width = toSpan(toColumnWidths(rows), gap);
  const height = toSpan(heights, gap);

  if (width <= 0 || height <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(Math.log(width / height));
};

const toGridRows = (boxes: readonly TidyBox[], gap: number): TidyBox[][] => {
  let best = toChunks(boxes, Math.max(1, boxes.length));
  let bestMiss = toSquareMiss(best, gap);

  for (let columns = 1; columns < boxes.length; columns += 1) {
    const rows = toChunks(boxes, columns);
    const miss = toSquareMiss(rows, gap);

    if (miss < bestMiss) {
      best = rows;
      bestMiss = miss;
    }
  }

  return best;
};

const toFlowPlaces = (
  rows: readonly TidyBox[][],
  gap: number,
  origin: TidyPoint
): TidyPlace[] => {
  const places: TidyPlace[] = [];
  let top = origin.y;

  for (const row of rows) {
    let left = origin.x;

    for (const box of row) {
      places.push({ id: box.id, x: toClamped(left), y: toClamped(top) });
      left += box.width + gap;
    }

    top += toRowHeight(row) + gap;
  }

  return places;
};

const toGridPlaces = (
  rows: readonly TidyBox[][],
  gap: number,
  origin: TidyPoint
): TidyPlace[] => {
  const widths = toColumnWidths(rows);
  const places: TidyPlace[] = [];
  let top = origin.y;

  for (const row of rows) {
    let left = origin.x;

    for (const [column, box] of row.entries()) {
      places.push({ id: box.id, x: toClamped(left), y: toClamped(top) });
      left += (widths[column] ?? box.width) + gap;
    }

    top += toRowHeight(row) + gap;
  }

  return places;
};

const toGroupOrigin = (boxes: readonly TidyBox[]): TidyPoint => ({
  x: Math.min(...boxes.map((box) => box.x)),
  y: Math.min(...boxes.map((box) => box.y)),
});

const toSectionOrigin = (section: TidyArea): TidyPoint => ({
  x: section.x + SECTION_PAD_SIDE,
  y: section.y + SECTION_PAD_TOP,
});

const toTidyFrames = (
  boxes: readonly TidyBox[],
  layout: TidyLayout,
  gap: number,
  origin: TidyPoint
): TidyPlace[] => {
  const rows = toRows(boxes);

  if (layout === "tidy") {
    return toFlowPlaces(rows, gap, origin);
  }

  const ordered = rows.flat();

  if (layout === "row") {
    return toFlowPlaces([ordered], gap, origin);
  }

  return toGridPlaces(toGridRows(ordered, gap), gap, origin);
};

const isInsideArea = (area: TidyArea, box: TidyBox): boolean =>
  box.x >= area.x &&
  box.y >= area.y &&
  box.x + box.width <= area.x + area.width &&
  box.y + box.height <= area.y + area.height;

const toFittedArea = (boxes: readonly TidyBox[]): TidyArea | null => {
  if (boxes.length === 0) {
    return null;
  }

  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    height: bottom - top + SECTION_PAD_TOP + SECTION_PAD_SIDE,
    width: right - left + SECTION_PAD_SIDE * 2,
    x: toClamped(left - SECTION_PAD_SIDE),
    y: toClamped(top - SECTION_PAD_TOP),
  };
};

export {
  isInsideArea,
  toFittedArea,
  toGroupOrigin,
  toSectionOrigin,
  toTidyFrames,
};

export type { TidyArea, TidyBox, TidyLayout, TidyPlace, TidyPoint };
