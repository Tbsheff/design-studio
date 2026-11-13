import type {
  ChangeKind,
  ChangedLayer,
} from "@design-studio/actions/version/changes/schema";

import type { PatchHunk } from "../../../shared/hunk.js";

interface SpanPoint {
  readonly col: number;
  readonly line: number;
}

interface ElementSpan {
  readonly end: SpanPoint;
  readonly loc: string;
  readonly start: SpanPoint;
  readonly tag: string;
  readonly tagEnd: SpanPoint;
}

interface FileChange {
  readonly after: readonly ElementSpan[];
  readonly before: readonly ElementSpan[];
  readonly file: string;
  readonly hunks: readonly PatchHunk[];
}

interface ChangedLayersResult {
  readonly isTruncated: boolean;
  readonly items: readonly ChangedLayer[];
}

interface LineChange {
  readonly col: number;
  readonly isSameText: boolean;
  readonly pairedLine: number | null;
}

interface ChangeBlock {
  readonly added: ReadonlyMap<number, LineChange>;
  readonly at: number;
  readonly isSameText: boolean;
  readonly removed: readonly number[];
}

interface BlockDraft {
  readonly addedLines: number[];
  readonly addedText: string[];
  readonly at: number;
  readonly removed: number[];
  readonly removedText: string[];
}

type LayerHit = readonly [ElementSpan, ChangeKind];

const KIND_RANK: Readonly<Record<ChangeKind, number>> = {
  added: 4,
  removed: 3,
  style: 2,
  text: 1,
};

const LINE_WIDTH = 1_000_000;

const TAG = /<[^<>]*>/gu;

const SPACE = /\s+/gu;

const LEAD = /^\s*/u;

const toBareText = (lines: readonly string[]): string =>
  lines.join(" ").replaceAll(TAG, " ").replaceAll(SPACE, " ").trim();

const toChangeCol = (before: string | null, after: string): number => {
  if (before === null) {
    return (LEAD.exec(after)?.[0].length ?? 0) + 1;
  }

  const shared = Math.min(before.length, after.length);
  let at = 0;

  while (at < shared && before[at] === after[at]) {
    at += 1;
  }

  return at + 1;
};

const toLineChange = (
  before: string | null,
  after: string,
  pairedLine: number | null
): LineChange => ({
  col: toChangeCol(before, after),
  isSameText: before !== null && toBareText([before]) === toBareText([after]),
  pairedLine,
});

const toBlock = (draft: BlockDraft): ChangeBlock => {
  const added = new Map<number, LineChange>();

  for (const [index, line] of draft.addedLines.entries()) {
    const text = draft.addedText[index] ?? "";
    const pairedLine = draft.removed[index] ?? null;
    added.set(
      line,
      toLineChange(draft.removedText[index] ?? null, text, pairedLine)
    );
  }

  return {
    added,
    at: draft.at,
    isSameText: toBareText(draft.addedText) === toBareText(draft.removedText),
    removed: draft.removed,
  };
};

const toDraft = (line: number): BlockDraft => ({
  addedLines: [],
  addedText: [],
  at: line,
  removed: [],
  removedText: [],
});

const toBlocks = (hunk: PatchHunk): readonly ChangeBlock[] => {
  const blocks: ChangeBlock[] = [];
  let draft: BlockDraft | null = null;
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;

  for (const line of hunk.lines) {
    if (line.sign === " ") {
      if (draft) {
        blocks.push(toBlock(draft));
        draft = null;
      }

      oldLine += 1;
      newLine += 1;
    } else if (line.sign === "+") {
      draft ??= toDraft(newLine);
      draft.addedLines.push(newLine);
      draft.addedText.push(line.text);
      newLine += 1;
    } else {
      draft ??= toDraft(newLine);
      draft.removed.push(oldLine);
      draft.removedText.push(line.text);
      oldLine += 1;
    }
  }

  if (draft) {
    blocks.push(toBlock(draft));
  }

  return blocks;
};

const toKey = (point: SpanPoint): number => point.line * LINE_WIDTH + point.col;

const toExtent = (span: ElementSpan): number =>
  toKey(span.end) - toKey(span.start);

const toEnclosing = (
  spans: readonly ElementSpan[],
  point: SpanPoint
): readonly ElementSpan[] => {
  const key = toKey(point);

  return spans
    .filter((span) => toKey(span.start) <= key && key <= toKey(span.end))
    .toSorted((left, right) => toExtent(left) - toExtent(right));
};

const isWithin = (
  span: ElementSpan,
  lines: ReadonlyMap<number, LineChange>
): boolean => {
  const { line: first } = span.start;
  const { line: last } = span.end;

  for (let line = first; line <= last; line += 1) {
    if (!lines.has(line)) {
      return false;
    }
  }

  return true;
};

const toOuterWithin = (
  enclosing: readonly ElementSpan[],
  lines: ReadonlyMap<number, LineChange>
): ElementSpan | null => {
  let found: ElementSpan | null = null;

  for (const span of enclosing) {
    if (!isWithin(span, lines)) {
      break;
    }

    found = span;
  }

  return found;
};

const toStartCount = (
  spans: readonly ElementSpan[],
  lines: Iterable<number>
): number => {
  const starts = new Set(spans.map((span) => span.start.line));
  let count = 0;

  for (const line of lines) {
    if (starts.has(line)) {
      count += 1;
    }
  }

  return count;
};

const toEditKind = (
  span: ElementSpan,
  point: SpanPoint,
  isSameText: boolean
): ChangeKind => {
  if (toKey(point) > toKey(span.tagEnd) || !isSameText) {
    return "text";
  }

  return "style";
};

const isReplaced = (
  change: FileChange,
  block: ChangeBlock,
  span: ElementSpan
): boolean => {
  const paired = block.added.get(span.start.line)?.pairedLine ?? null;

  return change.before.some(
    (old) => old.start.line === paired && old.tag === span.tag
  );
};

const toAddedHit = (
  change: FileChange,
  block: ChangeBlock,
  point: SpanPoint,
  isSameText: boolean
): LayerHit | null => {
  const enclosing = toEnclosing(change.after, point);
  const [inner] = enclosing;

  if (!inner) {
    return null;
  }

  const whole = toOuterWithin(enclosing, block.added);

  const isGrown =
    toStartCount(change.after, block.added.keys()) >
    toStartCount(change.before, block.removed);

  if (whole && isGrown && !isReplaced(change, block, whole)) {
    return [whole, "added"];
  }

  return [inner, toEditKind(inner, point, isSameText)];
};

const toNeighbor = (
  spans: readonly ElementSpan[],
  point: SpanPoint
): ElementSpan | null => {
  const key = toKey(point);

  const [next] = spans
    .filter((span) => toKey(span.start) >= key)
    .toSorted(
      (left, right) =>
        toKey(left.start) - toKey(right.start) ||
        toExtent(right) - toExtent(left)
    );

  const [last] = spans
    .filter((span) => toKey(span.end) < key)
    .toSorted(
      (left, right) =>
        toKey(right.end) - toKey(left.end) || toExtent(right) - toExtent(left)
    );

  return next ?? last ?? null;
};

const toRemovedHit = (
  change: FileChange,
  block: ChangeBlock,
  gone: number
): LayerHit | null => {
  const point = { col: 1, line: block.at };
  const [inner] = toEnclosing(change.after, point);

  if (gone > 0) {
    const near = inner ?? toNeighbor(change.after, point);

    if (!near) {
      return null;
    }

    return [near, "removed"];
  }

  if (!inner) {
    return null;
  }

  return [inner, toEditKind(inner, point, block.isSameText)];
};

const toBlockHits = (
  change: FileChange,
  block: ChangeBlock
): readonly LayerHit[] => {
  const hits: LayerHit[] = [];

  for (const [line, lineChange] of block.added) {
    const hit = toAddedHit(
      change,
      block,
      { col: lineChange.col, line },
      lineChange.isSameText
    );

    if (hit) {
      hits.push(hit);
    }
  }

  const gone =
    toStartCount(change.before, block.removed) -
    toStartCount(change.after, block.added.keys());

  if (block.added.size === 0 || gone > 0) {
    const hit = toRemovedHit(change, block, gone);

    if (hit) {
      hits.push(hit);
    }
  }

  return hits;
};

const toFileLayers = (
  change: FileChange
): readonly (readonly [ElementSpan, ChangeKind, number])[] =>
  change.hunks.flatMap((hunk) =>
    toBlocks(hunk).flatMap((block) =>
      toBlockHits(change, block).map(
        ([span, kind]) => [span, kind, hunk.index] as const
      )
    )
  );

const toLayer = (
  change: FileChange,
  span: ElementSpan,
  changeKind: ChangeKind,
  hunkIndex: number
): ChangedLayer => ({
  file: change.file,
  hunk: hunkIndex,
  kind: changeKind,
  layerId: span.loc,
  line: span.start.line,
  tag: span.tag,
});

const toChangedLayers = (
  changes: readonly FileChange[],
  max: number
): ChangedLayersResult => {
  const byLayer = new Map<string, ChangedLayer>();

  for (const change of changes) {
    for (const [span, kind, hunk] of toFileLayers(change)) {
      const seen = byLayer.get(span.loc);

      if (!seen || KIND_RANK[kind] > KIND_RANK[seen.kind]) {
        byLayer.set(span.loc, toLayer(change, span, kind, hunk));
      }
    }
  }

  const items = [...byLayer.values()];

  return { isTruncated: items.length > max, items: items.slice(0, max) };
};

export { toChangedLayers };

export type { ChangedLayersResult, ElementSpan, FileChange, SpanPoint };
