import { kindFor } from "./classify.js";
import type { Preset } from "./samples.js";
import { longText, pseudoLocalize, shortText } from "./stress.js";
import { findElement, scanSource } from "./tags.js";
import type { Element } from "./tags.js";
import { contentValue } from "./values.js";

type ContentMode = "empty" | "long" | "pseudo" | "sample" | "short";

type ContentFailure = "element_not_found" | "invalid_request" | "no_text";

interface ContentRequest {
  readonly col: number;
  readonly line: number;
  readonly mode: ContentMode;
  readonly preset: Preset;
  readonly repeat: number;
  readonly seed: number;
}

interface ContentValue {
  readonly code: string;
  readonly replaced: number;
  readonly rows: number;
}

type ContentResult =
  | { readonly ok: false; readonly code: ContentFailure }
  | { readonly ok: true; readonly value: ContentValue };

interface Slot {
  readonly column: number;
  readonly end: number;
  readonly row: number;
  readonly start: number;
  readonly text: string;
}

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

const MAX_REPEAT = 50;

const BRACES = /[{}]/u;

const escapeText = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const offsetOf = (source: string, line: number, col: number): number => {
  const lines = source.split("\n");

  if (line < 1 || line > lines.length) {
    return -1;
  }

  const before = lines
    .slice(0, line - 1)
    .reduce((sum, row) => sum + row.length + 1, 0);

  return before + col - 1;
};

const rowOfOffset = (rows: readonly Element[], offset: number): number =>
  rows.findIndex((row) => offset >= row.openStart && offset < row.closeEnd);

const slotsOf = (
  source: string,
  target: Element,
  rows: readonly Element[]
): Slot[] => {
  const { runs } = scanSource(source);
  const counts = new Map<number, number>();
  const slots: Slot[] = [];

  for (const run of runs) {
    const raw = source.slice(run.start, run.end);
    const trimmed = raw.trim();
    const inside = run.start >= target.openEnd && run.end <= target.closeStart;

    if (inside && trimmed !== "" && !BRACES.test(trimmed)) {
      const rowIndex = rowOfOffset(rows, run.start);
      const ordinal = counts.get(rowIndex) ?? 0;
      counts.set(rowIndex, ordinal + 1);
      const begin = run.start + raw.length - raw.trimStart().length;

      slots.push({
        column: ordinal,
        end: begin + trimmed.length,
        row: rowIndex,
        start: begin,
        text: trimmed,
      });
    }
  }

  return slots;
};

const sampleText = (
  request: ContentRequest,
  slot: Slot,
  rowIndex: number
): string => {
  const kind = kindFor(slot.text, request.preset, slot.column);

  return contentValue(request, kind, rowIndex, slot.column);
};

const MAKERS: Readonly<
  Record<
    ContentMode,
    (request: ContentRequest, slot: Slot, row: number) => string
  >
> = {
  empty: () => "",
  long: (_request, slot, row) => longText(row + slot.column),
  pseudo: (_request, slot) => pseudoLocalize(slot.text),
  sample: sampleText,
  short: (_request, slot, row) => shortText(row + slot.column),
};

const textFor = (
  request: ContentRequest,
  slot: Slot,
  rowIndex: number
): string => MAKERS[request.mode](request, slot, rowIndex);

const applySplices = (source: string, splices: readonly Splice[]): string => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);

  return ordered.reduce(
    (code, splice) =>
      code.slice(0, splice.start) + splice.text + code.slice(splice.end),
    source
  );
};

const spliceOfSlot = (
  request: ContentRequest,
  slot: Slot,
  rowIndex: number,
  shift: number
): Splice => ({
  end: slot.end - shift,
  start: slot.start - shift,
  text: escapeText(textFor(request, slot, rowIndex)),
});

interface CloneSource {
  readonly first: Element;
  readonly request: ContentRequest;
  readonly slots: readonly Slot[];
  readonly source: string;
}

const cloneOf = (from: CloneSource, rowIndex: number): string => {
  const { first, request, slots, source } = from;
  const own = slots.filter((slot) => slot.row === 0);

  const splices = own.map((slot) =>
    spliceOfSlot(request, slot, rowIndex, first.openStart)
  );

  return applySplices(source.slice(first.openStart, first.closeEnd), splices);
};

const separatorOf = (source: string, rows: readonly Element[]): string => {
  const first = rows.at(0) ?? null;
  const second = rows.at(1) ?? null;

  if (first === null || second === null) {
    return "\n";
  }

  return source.slice(first.closeEnd, second.openStart);
};

const rowIndexOf = (request: ContentRequest, row: number): number => {
  if (row <= 0) {
    return 0;
  }

  return row + request.repeat - 1;
};

const clonesOf = (
  source: string,
  request: ContentRequest,
  rows: readonly Element[],
  slots: readonly Slot[]
): Splice | null => {
  const first = rows.at(0) ?? null;

  if (first === null || request.repeat < 2) {
    return null;
  }

  const separator = separatorOf(source, rows);
  const copies: string[] = [];

  for (let rowIndex = 1; rowIndex < request.repeat; rowIndex += 1) {
    copies.push(
      separator + cloneOf({ first, request, slots, source }, rowIndex)
    );
  }

  return { end: first.closeEnd, start: first.closeEnd, text: copies.join("") };
};

const isValid = (request: ContentRequest): boolean => {
  const isRepeatOk =
    Number.isInteger(request.repeat) &&
    request.repeat >= 1 &&
    request.repeat <= MAX_REPEAT;

  return isRepeatOk && request.line >= 1 && request.col >= 1;
};

const addedRows = (request: ContentRequest, clones: Splice | null): number => {
  if (clones === null) {
    return 0;
  }

  return request.repeat - 1;
};

const applyContent = (
  source: string,
  request: ContentRequest
): ContentResult => {
  if (!isValid(request)) {
    return { code: "invalid_request", ok: false };
  }

  const offset = offsetOf(source, request.line, request.col);
  const target = findElement(scanSource(source).root, offset);

  if (target === null) {
    return { code: "element_not_found", ok: false };
  }

  const rows = target.children;
  const slots = slotsOf(source, target, rows);

  if (slots.length === 0) {
    return { code: "no_text", ok: false };
  }

  const splices = slots.map((slot) =>
    spliceOfSlot(request, slot, rowIndexOf(request, slot.row), 0)
  );

  const clones = clonesOf(source, request, rows, slots);
  const all = [...splices];

  if (clones !== null) {
    all.push(clones);
  }

  const total = Math.max(rows.length, 1);
  const added = addedRows(request, clones);

  return {
    ok: true,
    value: {
      code: applySplices(source, all),
      replaced: slots.length,
      rows: total + added,
    },
  };
};

export { applyContent };

export type { ContentFailure, ContentMode, ContentRequest, ContentResult };
