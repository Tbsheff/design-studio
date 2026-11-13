import type { ChangeKind } from "@design-studio/actions/version/changes/schema";

import type { PatchHunk } from "../../../shared/hunk.js";
import type { ElementSpan, SpanPoint } from "./to-changed-layers.js";
import { toFromLine, toHunkBlocks } from "./to-line-map.js";
import type { LineBlock } from "./to-line-map.js";

interface LayerRestoreInput {
  readonly from: string;
  readonly fromSpans: readonly ElementSpan[];
  readonly head: string;
  readonly headSpans: readonly ElementSpan[];
  readonly hunks: readonly PatchHunk[];
  readonly kind: ChangeKind;
  readonly layerId: string;
  readonly to: string;
  readonly toSpans: readonly ElementSpan[];
}

interface LayerRestored {
  readonly ok: true;
  readonly source: string;
}

interface LayerRefused {
  readonly code: "changed" | "not_found" | "unsupported";
  readonly ok: false;
}

type LayerRestoreResult = LayerRefused | LayerRestored;

interface SpanText {
  readonly end: number;
  readonly open: number;
  readonly start: number;
}

const NEWLINE = "\n";

const toRefused = (code: LayerRefused["code"]): LayerRefused => ({
  code,
  ok: false,
});

const toRestored = (source: string): LayerRestored => ({ ok: true, source });

const toLineStarts = (text: string): readonly number[] => {
  const starts = [0];

  for (
    let at = text.indexOf(NEWLINE);
    at !== -1;
    at = text.indexOf(NEWLINE, at + 1)
  ) {
    starts.push(at + 1);
  }

  return starts;
};

const toOffset = (starts: readonly number[], point: SpanPoint): number =>
  (starts[point.line - 1] ?? 0) + point.col - 1;

const toSpanText = (
  starts: readonly number[],
  span: ElementSpan
): SpanText => ({
  end: toOffset(starts, span.end),
  open: toOffset(starts, span.tagEnd),
  start: toOffset(starts, span.start),
});

const toNearest = (
  spans: readonly ElementSpan[],
  line: number,
  col: number
): ElementSpan | null => {
  const [found] = spans.toSorted(
    (left, right) =>
      Math.abs(left.start.line - line) - Math.abs(right.start.line - line) ||
      Math.abs(left.start.col - col) - Math.abs(right.start.col - col)
  );

  return found ?? null;
};

const toFromSpan = (
  input: LayerRestoreInput,
  span: ElementSpan
): ElementSpan | null => {
  const line = toFromLine(input.hunks, span.start.line);

  if (line === null) {
    return null;
  }

  const same = input.fromSpans.filter(
    (entry) => entry.tag === span.tag && entry.start.line === line
  );

  return toNearest(same, line, span.start.col);
};

const toHeadSpan = (
  input: LayerRestoreInput,
  span: ElementSpan,
  isMatch: (text: SpanText) => boolean
): SpanText | null => {
  const starts = toLineStarts(input.head);

  const matches = input.headSpans.filter(
    (entry) => entry.tag === span.tag && isMatch(toSpanText(starts, entry))
  );

  const found = toNearest(matches, span.start.line, span.start.col);

  if (!found) {
    return null;
  }

  return toSpanText(starts, found);
};

const toOpenText = (text: string, at: SpanText): string =>
  text.slice(at.start, at.open);

const toInnerText = (text: string, at: SpanText): string =>
  text.slice(at.open, at.end);

const toOuterText = (text: string, at: SpanText): string =>
  text.slice(at.start, at.end);

const toSpliced = (
  text: string,
  start: number,
  end: number,
  insert: string
): string => text.slice(0, start) + insert + text.slice(end);

const toEditedLayer = (
  input: LayerRestoreInput,
  span: ElementSpan
): LayerRestoreResult => {
  const old = toFromSpan(input, span);

  if (!old) {
    return toRefused("not_found");
  }

  const toAt = toSpanText(toLineStarts(input.to), span);
  const fromAt = toSpanText(toLineStarts(input.from), old);

  if (input.kind === "style") {
    const open = toOpenText(input.to, toAt);

    const head = toHeadSpan(
      input,
      span,
      (at) => toOpenText(input.head, at) === open
    );

    if (!head) {
      return toRefused("changed");
    }

    return toRestored(
      toSpliced(
        input.head,
        head.start,
        head.open,
        toOpenText(input.from, fromAt)
      )
    );
  }

  const inner = toInnerText(input.to, toAt);

  const head = toHeadSpan(
    input,
    span,
    (at) => toInnerText(input.head, at) === inner
  );

  if (!head) {
    return toRefused("changed");
  }

  return toRestored(
    toSpliced(input.head, head.open, head.end, toInnerText(input.from, fromAt))
  );
};

const isBlank = (text: string): boolean => text.trim() === "";

const toLineCut = (text: string, at: SpanText): SpanText => {
  const lineStart = text.lastIndexOf(NEWLINE, at.start - 1) + 1;
  const newline = text.indexOf(NEWLINE, at.end);
  let lineEnd = text.length;

  if (newline !== -1) {
    lineEnd = newline + 1;
  }

  if (
    isBlank(text.slice(lineStart, at.start)) &&
    isBlank(text.slice(at.end, lineEnd))
  ) {
    return { end: lineEnd, open: at.open, start: lineStart };
  }

  return at;
};

const toAddedLayer = (
  input: LayerRestoreInput,
  span: ElementSpan
): LayerRestoreResult => {
  const outer = toOuterText(input.to, toSpanText(toLineStarts(input.to), span));

  const head = toHeadSpan(
    input,
    span,
    (at) => toOuterText(input.head, at) === outer
  );

  if (!head) {
    return toRefused("changed");
  }

  const cut = toLineCut(input.head, head);

  return toRestored(toSpliced(input.head, cut.start, cut.end, ""));
};

const isWithinLines = (
  span: ElementSpan,
  lines: ReadonlySet<number>
): boolean => {
  const {
    end: { line: last },
    start: { line: first },
  } = span;

  for (let line = first; line <= last; line += 1) {
    if (!lines.has(line)) {
      return false;
    }
  }

  return true;
};

const toRemovedSpan = (
  input: LayerRestoreInput,
  block: LineBlock
): ElementSpan | null => {
  const removed = new Set(block.removed);

  const [outer] = input.fromSpans
    .filter((span) => isWithinLines(span, removed))
    .toSorted(
      (left, right) =>
        left.start.line - right.start.line || right.end.line - left.end.line
    );

  return outer ?? null;
};

const isEnclosing = (span: ElementSpan, line: number): boolean =>
  span.start.line <= line && line <= span.end.line;

const toRemovedBlock = (
  input: LayerRestoreInput,
  span: ElementSpan
): LineBlock | null => {
  const blocks: LineBlock[] = [];

  for (const hunk of input.hunks) {
    for (const block of toHunkBlocks(hunk)) {
      if (toRemovedSpan(input, block) !== null) {
        blocks.push(block);
      }
    }
  }

  const [found] = blocks.toSorted(
    (left, right) =>
      Number(isEnclosing(span, right.at)) -
        Number(isEnclosing(span, left.at)) ||
      Math.abs(left.at - span.start.line) - Math.abs(right.at - span.start.line)
  );

  return found ?? null;
};

const toLines = (text: string): readonly string[] => text.split(NEWLINE);

const toAnchorIndex = (
  headLines: readonly string[],
  before: string | null,
  after: string | null,
  near: number
): number | null => {
  const found: number[] = [];

  for (let index = 0; index <= headLines.length; index += 1) {
    const isBefore = before === null || headLines[index - 1] === before;
    const isAfter = after === null || headLines[index] === after;

    if (isBefore && isAfter) {
      found.push(index);
    }
  }

  const [best] = found.toSorted(
    (left, right) => Math.abs(left - near) - Math.abs(right - near)
  );

  return best ?? null;
};

const toKeptLine = (
  lines: readonly string[],
  removed: ReadonlySet<number>,
  first: number,
  step: number
): string | null => {
  let line = first;

  while (removed.has(line)) {
    line += step;
  }

  return lines[line - 1] ?? null;
};

const toRemovedLayer = (
  input: LayerRestoreInput,
  span: ElementSpan
): LayerRestoreResult => {
  const block = toRemovedBlock(input, span);
  const gone = block && toRemovedSpan(input, block);

  if (!block || !gone) {
    return toRefused("not_found");
  }

  if (block.added.length > 0) {
    return toRefused("unsupported");
  }

  const fromLines = toLines(input.from);
  const headLines = toLines(input.head);
  const removed = new Set(block.removed);
  const before = toKeptLine(fromLines, removed, gone.start.line - 1, -1);
  const after = toKeptLine(fromLines, removed, gone.end.line + 1, 1);
  const at = toAnchorIndex(headLines, before, after, block.at - 1);

  if (at === null) {
    return toRefused("changed");
  }

  const back = fromLines.slice(gone.start.line - 1, gone.end.line);

  return toRestored(
    [...headLines.slice(0, at), ...back, ...headLines.slice(at)].join(NEWLINE)
  );
};

const toRestoredLayer = (input: LayerRestoreInput): LayerRestoreResult => {
  const span = input.toSpans.find((entry) => entry.loc === input.layerId);

  if (!span) {
    return toRefused("not_found");
  }

  if (input.kind === "added") {
    return toAddedLayer(input, span);
  }

  if (input.kind === "removed") {
    return toRemovedLayer(input, span);
  }

  return toEditedLayer(input, span);
};

export { toRestoredLayer };

export type { LayerRestoreInput, LayerRestoreResult };
