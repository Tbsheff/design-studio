import { dataFill } from "./copy.js";
import { parseRows } from "./deps.js";
import type { ParseFailureCode } from "./deps.js";

interface PreviewCell {
  readonly id: string;
  readonly text: string;
}

interface PreviewRowData {
  readonly cells: readonly PreviewCell[];
  readonly id: string;
}

interface DataFillPreview {
  readonly code: ParseFailureCode | null;
  readonly head: PreviewRowData;
  readonly rows: readonly PreviewRowData[];
  readonly total: number;
}

const PREVIEW_ROWS = 3;

const EMPTY_ROW: PreviewRowData = { cells: [], id: "head" };

const EMPTY_PREVIEW: DataFillPreview = {
  code: null,
  head: EMPTY_ROW,
  rows: [],
  total: 0,
};

const toRowData = (id: string, cells: readonly string[]): PreviewRowData => ({
  cells: cells.map((text, index) => ({ id: `${id}:${index + 1}`, text })),
  id,
});

const toPreview = (text: string): DataFillPreview => {
  if (text.trim() === "") {
    return EMPTY_PREVIEW;
  }

  const parsed = parseRows(text);

  if (!parsed.ok) {
    return { ...EMPTY_PREVIEW, code: parsed.code };
  }

  const columns = Math.max(0, ...parsed.rows.map((row) => row.length));

  const labels = Array.from(
    { length: columns },
    (_cell, index) => `${dataFill.cell} ${index + 1}`
  );

  return {
    code: null,
    head: toRowData("head", labels),
    rows: parsed.rows
      .slice(0, PREVIEW_ROWS)
      .map((row, index) => toRowData(`row${index}`, row)),
    total: parsed.rows.length,
  };
};

const toNote = (preview: DataFillPreview): string => {
  if (preview.code !== null) {
    return dataFill.error[preview.code];
  }

  if (preview.total > 0) {
    return `${preview.total} ${dataFill.total}`;
  }

  return dataFill.paste;
};

const toFilledText = (filledRows: number | null): string => {
  if (filledRows === null) {
    return "";
  }

  return `${dataFill.filled} ${filledRows}`;
};

export { PREVIEW_ROWS, toFilledText, toNote, toPreview };

export type { DataFillPreview, PreviewCell, PreviewRowData };
