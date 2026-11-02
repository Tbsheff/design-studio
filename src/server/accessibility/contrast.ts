import { formatHex, parse, wcagContrast } from "culori";

import { nearestPassingToken, parseLoc } from "./deps.js";
import type {
  CompiledTokenEntry,
  ContrastFix,
  ContrastPair,
  SourceLoc,
} from "./deps.js";
import type { RawText } from "./probe.js";

const NEED_TEXT = 4.5;

const NEED_LARGE = 3;

const RATIO_STEPS = 100;

const hexOf = (value: string): string => {
  const color = parse(value);

  if (!color) {
    return value;
  }

  return formatHex(color) ?? value;
};

const ratioOf = (foreground: string, background: string): number | null => {
  const fg = parse(foreground);
  const bg = parse(background);

  if (!fg || !bg) {
    return null;
  }

  return Math.round(wcagContrast(fg, bg) * RATIO_STEPS) / RATIO_STEPS;
};

const fixOf = (
  frameId: string,
  raw: RawText,
  loc: SourceLoc | null,
  cssVar: string | null
): ContrastFix | null => {
  if (loc === null || cssVar === null) {
    return null;
  }

  return {
    frame: frameId,
    matches: [
      { property: "color", selector: raw.selector, source: loc, tag: raw.tag },
    ],
    token: cssVar,
    tool: "replace_style",
  };
};

const pairOf = (
  frame: string,
  raw: RawText,
  entries: readonly CompiledTokenEntry[]
): ContrastPair | null => {
  if (raw.background === null) {
    return null;
  }

  const measured = ratioOf(raw.foreground, raw.background);

  if (measured === null) {
    return null;
  }

  let needed = NEED_TEXT;

  if (raw.large) {
    needed = NEED_LARGE;
  }

  const isPassing = measured >= needed;
  const loc = parseLoc(raw.loc);
  let nearest: ContrastPair["token"] = null;

  if (!isPassing) {
    nearest = nearestPassingToken(raw.foreground, raw.background, needed, [
      ...entries,
    ]);
  }

  return {
    background: hexOf(raw.background),
    fix: fixOf(frame, raw, loc, nearest?.cssVar ?? null),
    foreground: hexOf(raw.foreground),
    large: raw.large,
    need: needed,
    passes: isPassing,
    ratio: measured,
    selector: raw.selector,
    source: loc,
    tag: raw.tag,
    text: raw.text,
    token: nearest,
  };
};

const contrastPairsOf = (
  frame: string,
  texts: readonly RawText[],
  entries: readonly CompiledTokenEntry[]
): ContrastPair[] => {
  const seen = new Set<string>();
  const pairs: ContrastPair[] = [];

  for (const raw of texts) {
    const pair = pairOf(frame, raw, entries);
    const key = `${raw.loc ?? raw.selector}|${raw.foreground}|${raw.background}`;

    if (pair !== null && !seen.has(key)) {
      seen.add(key);
      pairs.push(pair);
    }
  }

  return pairs.toSorted((left, right) => left.ratio - right.ratio);
};

export { contrastPairsOf };
