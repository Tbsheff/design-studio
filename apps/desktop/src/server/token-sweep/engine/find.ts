import { parseColor } from "./color.js";
import { lengthPx } from "./length.js";
import type { Candidate, Region, SweepKind } from "./types.js";

interface FindOptions {
  readonly isCss: boolean;
  readonly kinds: ReadonlySet<SweepKind>;
  readonly region: Region | null;
}

const CLASS_PATTERN =
  /(?<![\w\]-])(?<sign>-?)(?<prefix>[a-z]+(?:-[a-z]{1,2})?)-\[(?<value>[^\]\s]+)\]/gu;

const COLOR_PATTERN =
  /#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])|rgba?\([^)]*\)/giu;

const DECLARATION_PATTERN =
  /\b(?<property>font-?size|border(?:-?(?:top|bottom)-?(?:left|right))?-?radius|(?:padding|margin)(?:-?(?:top|right|bottom|left|inline|block))?|(?:row-|column-)?gap|rowGap|columnGap)["']?\s*:\s*["']?(?<body>[^;}"'\n]*)/giu;

const LENGTH_PATTERN = /(?<![\w.#-])(?<amount>\d+(?:\.\d+)?)(?:px|rem)\b/gu;

const COLOR_PREFIXES = new Set([
  "accent",
  "bg",
  "border",
  "caret",
  "decoration",
  "divide",
  "fill",
  "from",
  "outline",
  "ring",
  "shadow",
  "stroke",
  "text",
  "to",
  "via",
]);

const SPACING_PREFIX = /^(?:[pm][xytrblse]?|gap(?:-[xy])?|space-[xy])$/u;
const RADIUS_PREFIX = /^rounded(?:-[a-z]{1,2})?$/u;
const STYLE_LOOKBACK = 240;
const TOKEN_LINE = /^\s*--[\w-]+\s*:/u;
const FALLBACK_TAIL = /var\([^)]*,\s*$/u;
const QUOTES = new Set(['"', "'", "`"]);

const lineStartsOf = (code: string): number[] => {
  const starts = [0];

  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === "\n") {
      starts.push(index + 1);
    }
  }

  return starts;
};

const lineOfOffset = (starts: readonly number[], offset: number): number => {
  let low = 0;
  let high = starts.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if ((starts[middle] ?? 0) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low + 1;
};

const lengthKind = (value: string, kind: SweepKind): SweepKind | null => {
  if (lengthPx(value) === null) {
    return null;
  }

  return kind;
};

const classKindOf = (prefix: string, value: string): SweepKind | null => {
  if (RADIUS_PREFIX.test(prefix)) {
    return lengthKind(value, "radius");
  }

  if (SPACING_PREFIX.test(prefix)) {
    return lengthKind(value, "spacing");
  }

  if (prefix === "text" && lengthPx(value) !== null) {
    return "font";
  }

  if (COLOR_PREFIXES.has(prefix.split("-")[0] ?? "") && parseColor(value)) {
    return "color";
  }

  return null;
};

const inRegion = (region: Region | null, start: number): boolean =>
  region === null || (start >= region.start && start < region.end);

const findClasses = (
  code: string,
  starts: readonly number[],
  region: Region | null
): Candidate[] => {
  const found: Candidate[] = [];

  for (const match of code.matchAll(CLASS_PATTERN)) {
    const groups = match.groups ?? {};

    const classKind = classKindOf(
      groups["prefix"] ?? "",
      groups["value"] ?? ""
    );

    if (classKind !== null && inRegion(region, match.index)) {
      found.push({
        end: match.index + match[0].length,
        form: "class",
        kind: classKind,
        line: lineOfOffset(starts, match.index),
        negative: groups["sign"] === "-",
        prefix: groups["prefix"] ?? "",
        raw: match[0],
        start: match.index,
        value: groups["value"] ?? "",
      });
    }
  }

  return found;
};

const isStyleContext = (code: string, start: number): boolean => {
  const lookback = code.slice(Math.max(0, start - STYLE_LOOKBACK), start);
  const anchor = lookback.lastIndexOf("style=");

  return anchor !== -1 && !lookback.slice(anchor).includes(">");
};

const lineTextBefore = (code: string, start: number): string => {
  const lineStart = code.lastIndexOf("\n", start - 1) + 1;

  return code.slice(lineStart, start);
};

const allowsLiteral = (
  code: string,
  start: number,
  isCss: boolean
): boolean => {
  const before = lineTextBefore(code, start);

  if (TOKEN_LINE.test(before) || FALLBACK_TAIL.test(before)) {
    return false;
  }

  return isCss || isStyleContext(code, start);
};

const overlaps = (taken: readonly Candidate[], start: number): boolean =>
  taken.some((entry) => start >= entry.start && start < entry.end);

const literalCandidate = (
  starts: readonly number[],
  match: RegExpExecArray | RegExpMatchArray
): Candidate => ({
  end: (match.index ?? 0) + match[0].length,
  form: "css",
  kind: "color",
  line: lineOfOffset(starts, match.index ?? 0),
  negative: false,
  prefix: "",
  raw: match[0],
  start: match.index ?? 0,
  value: match[0],
});

const findColors = (
  code: string,
  starts: readonly number[],
  options: FindOptions,
  taken: readonly Candidate[]
): Candidate[] => {
  const found: Candidate[] = [];

  for (const match of code.matchAll(COLOR_PATTERN)) {
    if (
      inRegion(options.region, match.index) &&
      !overlaps(taken, match.index) &&
      allowsLiteral(code, match.index, options.isCss)
    ) {
      found.push(literalCandidate(starts, match));
    }
  }

  return found;
};

const declarationKind = (property: string): SweepKind => {
  const lower = property.toLowerCase();

  if (lower.includes("radius")) {
    return "radius";
  }

  if (lower.includes("font")) {
    return "font";
  }

  return "spacing";
};

const lengthsOf = (
  body: string,
  base: number,
  declared: SweepKind,
  starts: readonly number[]
): Candidate[] => {
  const found: Candidate[] = [];

  for (const unit of body.matchAll(LENGTH_PATTERN)) {
    const at = base + unit.index;

    if (Number(unit.groups?.["amount"] ?? "0") > 0) {
      found.push({
        end: at + unit[0].length,
        form: "css",
        kind: declared,
        line: lineOfOffset(starts, at),
        negative: false,
        prefix: "",
        raw: unit[0],
        start: at,
        value: unit[0],
      });
    }
  }

  return found;
};

const findLengths = (
  code: string,
  starts: readonly number[],
  options: FindOptions
): Candidate[] => {
  const found: Candidate[] = [];

  for (const match of code.matchAll(DECLARATION_PATTERN)) {
    const body = match.groups?.["body"] ?? "";
    const base = match.index + match[0].length - body.length;

    if (
      inRegion(options.region, match.index) &&
      !body.includes("var(") &&
      !body.includes("calc(") &&
      allowsLiteral(code, match.index, options.isCss)
    ) {
      found.push(
        ...lengthsOf(
          body,
          base,
          declarationKind(match.groups?.["property"] ?? ""),
          starts
        )
      );
    }
  }

  return found;
};

const advanceTag = (
  state: { depth: number; quote: string },
  char: string
): boolean => {
  if (state.quote !== "") {
    if (char === state.quote) {
      state.quote = "";
    }

    return false;
  }

  if (QUOTES.has(char)) {
    state.quote = char;
  } else if (char === "{") {
    state.depth += 1;
  } else if (char === "}") {
    state.depth -= 1;
  } else {
    return char === ">" && state.depth <= 0;
  }

  return false;
};

const tagRegion = (code: string, line: number, col: number): Region | null => {
  const starts = lineStartsOf(code);

  if (line < 1 || line > starts.length) {
    return null;
  }

  const begin = (starts[line - 1] ?? 0) + Math.max(0, col - 1);
  const state = { depth: 0, quote: "" };

  for (let index = begin; index < code.length; index += 1) {
    if (advanceTag(state, code[index] ?? "")) {
      return { end: index + 1, start: begin };
    }
  }

  return { end: code.length, start: begin };
};

const findCandidates = (code: string, options: FindOptions): Candidate[] => {
  const starts = lineStartsOf(code);
  const classes = findClasses(code, starts, options.region);

  const rest = [
    ...findColors(code, starts, options, classes),
    ...findLengths(code, starts, options),
  ];

  return [...classes, ...rest]
    .filter((entry) => options.kinds.has(entry.kind))
    .toSorted((left, right) => left.start - right.start);
};

export { findCandidates, tagRegion };
