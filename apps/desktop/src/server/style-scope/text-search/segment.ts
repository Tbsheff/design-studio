import type { TextHitKind, TextLayer } from "./deps.js";
import { replacementOf } from "./match.js";
import type { Found } from "./match.js";

interface Piece {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface SegmentBase {
  readonly kind: TextHitKind;
  readonly attribute: string | null;
  readonly encode: (text: string) => string;
  readonly layer: TextLayer;
}

interface Segment extends SegmentBase {
  readonly pieces: readonly Piece[];
  readonly text: string;
  readonly pieceAt: readonly number[];
  readonly pieceStart: readonly number[];
}

interface Splice {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Span {
  readonly from: number;
  readonly to: number;
  readonly founds: Found[];
}

const toSegment = (base: SegmentBase, pieces: readonly Piece[]): Segment => {
  const pieceAt: number[] = [];
  const pieceStart: number[] = [];
  let text = "";

  for (const [index, piece] of pieces.entries()) {
    pieceStart.push(text.length);
    text += piece.text;

    pieceAt.push(...Array.from({ length: piece.text.length }, () => index));
  }

  return { ...base, pieceAt, pieceStart, pieces, text };
};

const toRawStartOf = (segment: Segment, decoded: number): number => {
  const index = segment.pieceAt[decoded] ?? 0;

  return segment.pieces[index]?.start ?? 0;
};

const toSpanOf = (segment: Segment, found: Found): Span => ({
  founds: [found],
  from: segment.pieceAt[found.start] ?? 0,
  to: segment.pieceAt[found.end - 1] ?? 0,
});

const toMergeSpans = (spans: readonly Span[]): Span[] => {
  const merged: Span[] = [];

  for (const span of spans) {
    const last = merged.at(-1);

    if (last && span.from <= last.to) {
      merged[merged.length - 1] = {
        founds: [...last.founds, ...span.founds],
        from: last.from,
        to: Math.max(last.to, span.to),
      };
    } else {
      merged.push(span);
    }
  }

  return merged;
};

const toSpanText = (
  segment: Segment,
  span: Span,
  replace: string,
  isRegex: boolean
): string => {
  const begin = segment.pieceStart[span.from] ?? 0;
  const last = segment.pieces[span.to];
  const finish = (segment.pieceStart[span.to] ?? 0) + (last?.text.length ?? 0);
  let out = "";
  let at = begin;

  for (const found of span.founds) {
    out += segment.text.slice(at, found.start);
    out += replacementOf(found, replace, isRegex);
    at = found.end;
  }

  return out + segment.text.slice(at, finish);
};

const toSplicesOf = (
  segment: Segment,
  founds: readonly Found[],
  replace: string,
  isRegex: boolean
): Splice[] => {
  const ordered = founds.toSorted((left, right) => left.start - right.start);
  const spans = toMergeSpans(ordered.map((found) => toSpanOf(segment, found)));

  return spans.map((span) => ({
    end: segment.pieces[span.to]?.end ?? 0,
    start: segment.pieces[span.from]?.start ?? 0,
    text: segment.encode(toSpanText(segment, span, replace, isRegex)),
  }));
};

const applySplices = (source: string, splices: readonly Splice[]): string => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let out = source;

  for (const splice of ordered) {
    out = out.slice(0, splice.start) + splice.text + out.slice(splice.end);
  }

  return out;
};

export {
  applySplices,
  toRawStartOf as rawStartOf,
  toSplicesOf as splicesOf,
  toSegment,
};

export type { Piece, Segment, SegmentBase, Splice };
