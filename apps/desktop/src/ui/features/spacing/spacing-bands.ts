import { kindOf } from "./spacing-model.js";
import type { Band, Rect, Slot, SpacingValues } from "./spacing-model.js";

const BAND_MAX = 40;
const ROW_SLACK = 1;

const band = (slot: Slot, rect: Rect, index = 0): Band => ({
  id: `${slot}-${index}`,
  kind: kindOf(slot),
  rect: {
    height: Math.max(0, rect.height),
    width: Math.max(0, rect.width),
    x: rect.x,
    y: rect.y,
  },
  slot,
});

const paddingBands = (area: Rect, vals: SpacingValues): Band[] => {
  const top = vals["padding-top"];
  const bottom = vals["padding-bottom"];
  const inner = area.height - top - bottom;

  return [
    band("padding-top", {
      height: top,
      width: area.width,
      x: area.x,
      y: area.y,
    }),
    band("padding-bottom", {
      height: bottom,
      width: area.width,
      x: area.x,
      y: area.y + area.height - bottom,
    }),
    band("padding-left", {
      height: inner,
      width: vals["padding-left"],
      x: area.x,
      y: area.y + top,
    }),
    band("padding-right", {
      height: inner,
      width: vals["padding-right"],
      x: area.x + area.width - vals["padding-right"],
      y: area.y + top,
    }),
  ];
};

const marginBands = (area: Rect, vals: SpacingValues): Band[] => {
  const top = Math.max(0, vals["margin-top"]);
  const bottom = Math.max(0, vals["margin-bottom"]);
  const left = Math.max(0, vals["margin-left"]);
  const right = Math.max(0, vals["margin-right"]);

  return [
    band("margin-top", {
      height: top,
      width: area.width,
      x: area.x,
      y: area.y - top,
    }),
    band("margin-bottom", {
      height: bottom,
      width: area.width,
      x: area.x,
      y: area.y + area.height,
    }),
    band("margin-left", {
      height: area.height,
      width: left,
      x: area.x - left,
      y: area.y,
    }),
    band("margin-right", {
      height: area.height,
      width: right,
      x: area.x + area.width,
      y: area.y,
    }),
  ];
};

const rowsOf = (children: readonly Rect[]): Rect[][] => {
  const sorted = [...children].toSorted(
    (one, two) => one.y - two.y || one.x - two.x
  );

  const rows: Rect[][] = [];

  for (const child of sorted) {
    const row = rows.at(-1);
    const bottom = Math.max(...(row ?? []).map((item) => item.y + item.height));

    if (row && child.y < bottom - ROW_SLACK) {
      row.push(child);
    } else {
      rows.push([child]);
    }
  }

  return rows.map((row) => row.toSorted((one, two) => one.x - two.x));
};

interface RowBox {
  readonly bottom: number;
  readonly top: number;
}

const rowBox = (row: readonly Rect[]): RowBox => ({
  bottom: Math.max(...row.map((item) => item.y + item.height)),
  top: Math.min(...row.map((item) => item.y)),
});

const columnGaps = (row: readonly Rect[], size: number): Rect[] => {
  const box = rowBox(row);

  return row.slice(1).map((next, index) => {
    const prev = row[index] ?? next;
    const mid = (prev.x + prev.width + next.x) / 2;

    return {
      height: box.bottom - box.top,
      width: size,
      x: mid - size / 2,
      y: box.top,
    };
  });
};

const rowGaps = (rows: readonly Rect[][], area: Rect, size: number): Rect[] =>
  rows.slice(1).map((next, index) => {
    const prev = rowBox(rows[index] ?? next);
    const mid = (prev.bottom + rowBox(next).top) / 2;

    return { height: size, width: area.width, x: area.x, y: mid - size / 2 };
  });

const gapBands = (
  area: Rect,
  vals: SpacingValues,
  children: readonly Rect[]
): Band[] => {
  const rows = rowsOf(children);
  const columns = rows.flatMap((row) => columnGaps(row, vals["column-gap"]));
  const between = rowGaps(rows, area, vals["row-gap"]);

  return [
    ...columns.map((rect, index) => band("column-gap", rect, index)),
    ...between.map((rect, index) => band("row-gap", rect, index)),
  ].slice(0, BAND_MAX);
};

interface BandsInput {
  readonly children: readonly Rect[];
  readonly layout: boolean;
  readonly margin: boolean;
  readonly rect: Rect;
  readonly values: SpacingValues;
}

const bandsOf = (input: BandsInput): Band[] => {
  const pad = paddingBands(input.rect, input.values);
  const gaps: Band[] = [];
  const outer: Band[] = [];

  if (input.layout && input.children.length > 1) {
    gaps.push(...gapBands(input.rect, input.values, input.children));
  }

  if (input.margin) {
    outer.push(...marginBands(input.rect, input.values));
  }

  return [...pad, ...gaps, ...outer];
};

export { bandsOf };

export type { BandsInput };
