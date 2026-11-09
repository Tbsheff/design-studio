import {
  applySplices,
  escapeText,
  offsetOf,
  separatorOf,
  slotsOf,
} from "./apply-content.js";
import type { Slot, Splice } from "./apply-content.js";
import { findElement, scanSource } from "./tags.js";
import type { Element } from "./tags.js";

interface FillRequest {
  readonly col: number;
  readonly columns: readonly number[] | null;
  readonly line: number;
  readonly rows: readonly (readonly string[])[];
}

interface FillValue {
  readonly code: string;
  readonly replaced: number;
  readonly rows: number;
}

type FillResult =
  | { readonly message: string; readonly ok: false }
  | { readonly ok: true; readonly value: FillValue };

const WHITESPACE = /\s+/gu;

const toRefusal = (message: string): FillResult => ({ message, ok: false });

const toCountText = (count: number, noun: string): string => {
  if (count === 1) {
    return `${count} ${noun}`;
  }

  return `${count} ${noun}s`;
};

const toSlotIndex = (
  request: FillRequest,
  cellIndex: number,
  slotCount: number
): number => {
  if (request.columns === null) {
    return cellIndex;
  }

  const mapped = request.columns[cellIndex] ?? -1;

  if (mapped >= slotCount) {
    return -1;
  }

  return mapped;
};

const toCellCount = (request: FillRequest): number =>
  Math.max(0, ...request.rows.map((row) => row.length));

const toCountFailure = (
  request: FillRequest,
  slotCount: number
): FillResult | null => {
  const cells = toCellCount(request);

  if (request.columns === null && cells > slotCount) {
    return toRefusal(
      `The data has ${toCountText(cells, "column")}, but each row has ${toCountText(slotCount, "text slot")}.`
    );
  }

  const badColumn =
    (request.columns ?? []).find((index) => index >= slotCount) ?? null;

  if (badColumn !== null) {
    return toRefusal(
      `The columns map uses slot ${badColumn}, but each row has ${toCountText(slotCount, "text slot")}.`
    );
  }

  return null;
};

const toRowSplices = (
  request: FillRequest,
  slots: readonly Slot[],
  rowIndex: number,
  shift: number
): Splice[] => {
  const cells = request.rows[rowIndex] ?? [];
  const splices: Splice[] = [];

  for (const [cellIndex, cell] of cells.entries()) {
    const slot = slots[toSlotIndex(request, cellIndex, slots.length)] ?? null;

    if (slot !== null) {
      splices.push({
        end: slot.end - shift,
        start: slot.start - shift,
        text: escapeText(cell.replaceAll(WHITESPACE, " ").trim()),
      });
    }
  }

  return splices;
};

const toIndent = (source: string, first: Element): string => {
  const lineStart = source.lastIndexOf("\n", first.openStart - 1) + 1;
  const before = source.slice(lineStart, first.openStart);

  if (before.trim() === "") {
    return before;
  }

  return "";
};

const toSeparator = (
  source: string,
  rows: readonly Element[],
  first: Element
): string => {
  if (rows.length > 1) {
    return separatorOf(source, rows);
  }

  return `\n${toIndent(source, first)}`;
};

const toRowText = (
  source: string,
  first: Element,
  rowSplices: readonly Splice[]
): string =>
  applySplices(source.slice(first.openStart, first.closeEnd), rowSplices);

const applyRows = (source: string, request: FillRequest): FillResult => {
  const target = findElement(
    scanSource(source).root,
    offsetOf(source, request.line, request.col)
  );

  if (target === null) {
    return toRefusal("No element starts at that line and column.");
  }

  const rows = target.children;
  const first = rows.at(0) ?? null;
  const slots = slotsOf(source, target, rows).filter((slot) => slot.row === 0);

  if (first === null || slots.length === 0) {
    return toRefusal("The first row of the layer has no plain text to fill.");
  }

  const failure = toCountFailure(request, slots.length);

  if (failure !== null) {
    return failure;
  }

  const last = rows.at(-1) ?? first;
  const separator = toSeparator(source, rows, first);

  const texts = request.rows.map((_row, rowIndex) =>
    toRowText(
      source,
      first,
      toRowSplices(request, slots, rowIndex, first.openStart)
    )
  );

  const code =
    source.slice(0, first.openStart) +
    texts.join(separator) +
    source.slice(last.closeEnd);

  return {
    ok: true,
    value: {
      code,
      replaced: request.rows.reduce((sum, row) => sum + row.length, 0),
      rows: request.rows.length,
    },
  };
};

export { applyRows };

export type { FillRequest, FillResult };
