import { markupAttribute } from "./encode.js";
import { HTML_FILE, layerExtent } from "./range-extent.js";
import type { Segment } from "./segment.js";
import { toSplitOuter } from "./split-inner.js";

type RangeStyle = "bold" | "class" | "italic" | "link" | "strike" | "underline";

type LineStyle = Extract<RangeStyle, "strike" | "underline">;

interface RangeSpec {
  readonly className: string | null;
  readonly column: number;
  readonly end: number;
  readonly href: string | null;
  readonly isRemove: boolean;
  readonly line: number;
  readonly start: number;
  readonly style: RangeStyle;
  readonly text: string | null;
}

type RangeOutcome =
  | { readonly code: string; readonly isOk: true }
  | { readonly isOk: false; readonly message: string };

interface Part {
  readonly isOwn: boolean;
  readonly kept: readonly number[];
  readonly segment: Segment;
  readonly text: string;
}

interface Placed {
  readonly index: number;
  readonly segment: Segment;
}

type Picked =
  | {
      readonly head: Placed;
      readonly isOk: true;
      readonly tail: Placed;
    }
  | { readonly isOk: false; readonly message: string };

interface LineRange {
  readonly from: number;
  readonly to: number;
}

interface TrimmedLine extends LineRange {
  readonly breakAt: number;
}

interface RawEnds {
  readonly end: number;
  readonly start: number;
}

const TAGS = {
  bold: ["strong", "b"],
  class: ["span"],
  italic: ["em", "i"],
  link: ["a", "link"],
  strike: ["s", "del", "strike"],
  underline: ["u", "ins"],
} as const satisfies Readonly<Record<RangeStyle, readonly string[]>>;

const LINE_CLASSES = {
  strike: "line-through",
  underline: "underline",
} as const satisfies Readonly<Record<LineStyle, string>>;

const LINE_PATTERNS = {
  strike: /["'\s]line-through["'\s]/u,
  underline: /["'\s]underline["'\s]/u,
} as const satisfies Readonly<Record<LineStyle, RegExp>>;

const TAILWIND_CLASS =
  /className=["'`{][^"'`]*\b(?:flex|grid|text-|bg-|font-|gap-|rounded|[mp][xytrbl]?-\d)/u;

const CLASS_PATTERN = /^[\w:/.[\]%#!-]+(?: [\w:/.[\]%#!-]+)*$/u;

const UNSAFE_HREF = /^\s*(?:javascript|vbscript|data):/iu;

const BLANK = /[ \t]/u;

const BREAK = /[\t\n\r]/u;

const toFail = (message: string): RangeOutcome => ({ isOk: false, message });

const isBadLink = (spec: RangeSpec): boolean =>
  spec.style === "link" &&
  !spec.isRemove &&
  (spec.href === null || UNSAFE_HREF.test(spec.href));

const isBadClass = (spec: RangeSpec): boolean =>
  spec.style === "class" &&
  !spec.isRemove &&
  (spec.className === null || !CLASS_PATTERN.test(spec.className));

const toSpecError = (spec: RangeSpec): string | null => {
  if (spec.end <= spec.start) {
    return "The range is empty. Select at least one character.";
  }

  if (isBadLink(spec)) {
    return "A link needs a safe href.";
  }

  if (isBadClass(spec)) {
    return "A color needs a token class such as text-brand.";
  }

  return null;
};

const toLineRanges = (text: string): LineRange[] => {
  const ranges: LineRange[] = [];
  let from = 0;
  let at = 0;

  while (at < text.length) {
    const char = text.charAt(at);

    if (char === "\n" || char === "\r") {
      ranges.push({ from, to: at });

      if (char === "\r" && text.charAt(at + 1) === "\n") {
        at += 1;
      }

      from = at + 1;
    }

    at += 1;
  }

  ranges.push({ from, to: text.length });

  return ranges;
};

const toTrimStart = (text: string, range: LineRange): number => {
  let { from } = range;

  while (from < range.to && BLANK.test(text.charAt(from))) {
    from += 1;
  }

  return from;
};

const toTrimEnd = (text: string, range: LineRange, from: number): number => {
  let { to } = range;

  while (to > from && BLANK.test(text.charAt(to - 1))) {
    to -= 1;
  }

  return to;
};

const toTrimmedLines = (text: string): TrimmedLine[] => {
  const ranges = toLineRanges(text);
  const lines: TrimmedLine[] = [];

  for (const [index, range] of ranges.entries()) {
    let { from, to } = range;

    if (index > 0) {
      from = toTrimStart(text, range);
    }

    if (index < ranges.length - 1) {
      to = toTrimEnd(text, range, from);
    }

    if (to > from) {
      lines.push({ breakAt: range.to, from, to });
    }
  }

  return lines;
};

const toJsxKept = (text: string): number[] => {
  const lines = toTrimmedLines(text);
  const kept: number[] = [];

  for (const [index, line] of lines.entries()) {
    for (let at = line.from; at < line.to; at += 1) {
      kept.push(at);
    }

    if (index < lines.length - 1) {
      kept.push(line.breakAt);
    }
  }

  return kept;
};

const toPart = (segment: Segment, isJsx: boolean, spec: RangeSpec): Part => {
  let kept = Array.from({ length: segment.text.length }, (_unused, at) => at);

  if (isJsx) {
    kept = toJsxKept(segment.text);
  }

  const text = kept
    .map((at) => {
      const char = segment.text.charAt(at);

      if (isJsx && BREAK.test(char)) {
        return " ";
      }

      return char;
    })
    .join("");

  const isOwn =
    segment.layer.line === spec.line && segment.layer.col === spec.column;

  return { isOwn, kept, segment, text };
};

const toPlaced = (
  parts: readonly Part[],
  rendered: string | null
): (Placed | null)[] | null => {
  const target = rendered ?? parts.map((part) => part.text).join("");

  const placed: (Placed | null)[] = Array.from(
    { length: target.length },
    () => null
  );

  let cursor = 0;

  for (const part of parts) {
    const at = target.indexOf(part.text, cursor);

    if (at === -1 && part.isOwn) {
      return null;
    }

    if (at !== -1) {
      for (const [offset, index] of part.kept.entries()) {
        placed[at + offset] = { index, segment: part.segment };
      }

      cursor = at + part.text.length;
    }
  }

  return placed;
};

const CROSS_MESSAGE =
  "The range crosses a {...} expression or another part of the layer. Select text inside one text part.";

const STALE_MESSAGE =
  "The text on the page does not match the source. Reload the frame and select the text again.";

const toPickFail = (message: string): Picked => ({ isOk: false, message });

const toPicked = (
  placed: readonly (Placed | null)[],
  spec: RangeSpec
): Picked => {
  if (spec.end > placed.length) {
    return toPickFail(STALE_MESSAGE);
  }

  const slice = placed.slice(spec.start, spec.end);
  const first = slice.at(0) ?? null;
  const last = slice.at(-1) ?? null;

  if (first === null || last === null) {
    return toPickFail(CROSS_MESSAGE);
  }

  const isOne = slice.every((item) => item?.segment === first.segment);

  if (!isOne) {
    return toPickFail(CROSS_MESSAGE);
  }

  return { head: first, isOk: true, tail: last };
};

const toRawEnds = (first: Placed, last: Placed): RawEnds => {
  const head = first.segment.pieces[first.segment.pieceAt[first.index] ?? 0];
  const tail = last.segment.pieces[last.segment.pieceAt[last.index] ?? 0];

  return { end: tail?.end ?? 0, start: head?.start ?? 0 };
};

const TAG_OPEN = "<";

const TAG_CLOSE = ">";

const toAttributeOf = (name: string, value: string | null): string =>
  ` ${name}="${markupAttribute('"')(value ?? "")}"`;

const isLineStyle = (style: RangeStyle): style is LineStyle =>
  Object.hasOwn(LINE_CLASSES, style);

const toTagName = (spec: RangeSpec, isClassLine: boolean): string => {
  const [tag = "span"] = TAGS[spec.style];

  if (isClassLine) {
    return "span";
  }

  return tag;
};

const toAttribute = (
  spec: RangeSpec,
  isJsx: boolean,
  isClassLine: boolean
): string => {
  if (spec.style === "link") {
    return toAttributeOf("href", spec.href);
  }

  if (isClassLine && isLineStyle(spec.style)) {
    return toAttributeOf("className", LINE_CLASSES[spec.style]);
  }

  if (spec.style === "class" && isJsx) {
    return toAttributeOf("className", spec.className);
  }

  if (spec.style === "class") {
    return toAttributeOf("class", spec.className);
  }

  return "";
};

const toOpenTag = (
  spec: RangeSpec,
  isJsx: boolean,
  isClassLine: boolean
): string =>
  `${TAG_OPEN}${toTagName(spec, isClassLine)}${toAttribute(spec, isJsx, isClassLine)}${TAG_CLOSE}`;

const toCloseTag = (spec: RangeSpec, isClassLine: boolean): string =>
  `${TAG_OPEN}/${toTagName(spec, isClassLine)}${TAG_CLOSE}`;

const isClassLineOf = (
  source: string,
  spec: RangeSpec,
  isJsx: boolean
): boolean => isJsx && isLineStyle(spec.style) && TAILWIND_CLASS.test(source);

const hasLineClass = (open: string, style: RangeStyle): boolean => {
  if (!isLineStyle(style)) {
    return false;
  }

  return LINE_PATTERNS[style].test(open);
};

const isStyledTag = (spec: RangeSpec, tag: string, open: string): boolean => {
  const tags: readonly string[] = TAGS[spec.style];

  if (tags.includes(tag.toLowerCase())) {
    return true;
  }

  return tag === "span" && hasLineClass(open, spec.style);
};

const toWrapped = (
  source: string,
  ends: RawEnds,
  spec: RangeSpec,
  isJsx: boolean
): string => {
  const isClassLine = isClassLineOf(source, spec, isJsx);

  return (
    source.slice(0, ends.start) +
    toOpenTag(spec, isJsx, isClassLine) +
    source.slice(ends.start, ends.end) +
    toCloseTag(spec, isClassLine) +
    source.slice(ends.end)
  );
};

const toUnwrapped = (
  file: string,
  source: string,
  ends: RawEnds,
  spec: RangeSpec
): RangeOutcome => {
  const extent = layerExtent(file, source, spec.line, spec.column);

  if (extent === null) {
    return toFail("This layer has no closing tag, so no style can be removed.");
  }

  const open = source.slice(extent.openStart, extent.openEnd);

  if (!isStyledTag(spec, extent.tag, open)) {
    return toFail(
      "This layer does not have that style. Select the styled text."
    );
  }

  const split = toSplitOuter({
    after: source.slice(ends.end, extent.closeStart),
    before: source.slice(extent.openEnd, ends.start),
    close: source.slice(extent.closeStart, extent.closeEnd),
    isJsx: !HTML_FILE.test(file),
    middle: source.slice(ends.start, ends.end),
    open,
  });

  if (!split.isOk) {
    return split;
  }

  return {
    code:
      source.slice(0, extent.openStart) +
      split.code +
      source.slice(extent.closeEnd),
    isOk: true,
  };
};

const toWrapRange = (
  file: string,
  source: string,
  segments: readonly Segment[],
  spec: RangeSpec
): RangeOutcome => {
  const problem = toSpecError(spec);

  if (problem !== null) {
    return toFail(problem);
  }

  const isJsx = !HTML_FILE.test(file);
  const parts = segments.map((segment) => toPart(segment, isJsx, spec));
  const placed = toPlaced(parts, spec.text);

  if (placed === null) {
    return toFail(STALE_MESSAGE);
  }

  const picked = toPicked(placed, spec);

  if (!picked.isOk) {
    return toFail(picked.message);
  }

  const ends = toRawEnds(picked.head, picked.tail);

  if (spec.isRemove) {
    return toUnwrapped(file, source, ends, spec);
  }

  return { code: toWrapped(source, ends, spec, isJsx), isOk: true };
};

export { toWrapRange as wrapRange };

export type { RangeOutcome, RangeSpec, RangeStyle };
