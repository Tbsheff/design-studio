import path from "node:path";

import { htmlElementSpan, jsxElementSpan, positionAt } from "./deps.js";
import type { SourceLoc, WrittenFile } from "./deps.js";

interface LayoutSlot {
  readonly index: number;
  readonly loc: SourceLoc;
}

interface SourceSpan {
  readonly end: number;
  readonly index: number;
  readonly start: number;
}

interface ReorderedChildren {
  readonly code: string;
  readonly locs: readonly SourceLoc[];
  readonly moved: number;
}

const HTML_EXTENSIONS = new Set([".html", ".htm"]);

const toSpan = (
  code: string,
  relative: string,
  loc: SourceLoc
): { readonly end: number; readonly start: number } | null => {
  const extension = path.extname(relative).toLowerCase();
  const position = { col: loc.col, line: loc.line };

  if (HTML_EXTENSIONS.has(extension)) {
    return htmlElementSpan(code, position);
  }

  return jsxElementSpan(code, position, extension === ".tsx");
};

const toSpans = (
  code: string,
  relative: string,
  slots: readonly LayoutSlot[]
): SourceSpan[] | null => {
  const spans = slots.flatMap((slot) => {
    const span = toSpan(code, relative, slot.loc);

    if (span === null) {
      return [];
    }

    return [{ end: span.end, index: slot.index, start: span.start }];
  });

  if (spans.length !== slots.length) {
    return null;
  }

  return spans.toSorted((first, second) => first.start - second.start);
};

const isSiblingRun = (code: string, spans: readonly SourceSpan[]): boolean =>
  spans.slice(1).every((span, index) => {
    const previous = spans[index] ?? null;

    return (
      previous !== null &&
      previous.end <= span.start &&
      code.slice(previous.end, span.start).trim() === ""
    );
  });

const toReorderedChildren = (
  work: WrittenFile,
  slots: readonly LayoutSlot[],
  order: readonly number[]
): ReorderedChildren | null => {
  const spans = toSpans(work.code, work.target.relative, slots);

  if (spans === null || !isSiblingRun(work.code, spans)) {
    return null;
  }

  const byIndex = new Map(spans.map((span) => [span.index, span]));
  const [first = null] = spans;
  const last = spans.at(-1) ?? null;

  if (first === null || last === null) {
    return null;
  }

  let code = work.code.slice(0, first.start);
  const starts = new Map<number, number>();
  let moved = 0;

  for (const [at, slot] of spans.entries()) {
    const index = order[at] ?? slot.index;
    const span = byIndex.get(index) ?? slot;
    const next = spans[at + 1] ?? null;

    starts.set(index, code.length);
    code += work.code.slice(span.start, span.end);

    if (next !== null) {
      code += work.code.slice(slot.end, next.start);
    }

    if (index !== slot.index) {
      moved += 1;
    }
  }

  code += work.code.slice(last.end);

  const file = slots[0]?.loc.file ?? "";

  const locs = slots.map((slot) => ({
    ...positionAt(code, starts.get(slot.index) ?? 0),
    file,
  }));

  return { code, locs, moved };
};

export { toReorderedChildren };

export type { LayoutSlot };
