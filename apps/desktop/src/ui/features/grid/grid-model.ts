import { parseVariant } from "./deps.js";
import type { GridInfo, SelectionContext } from "./deps.js";

type GridAxis = "columns" | "rows";

type LineKey = "colSpan" | "colStart" | "rowSpan" | "rowStart";

interface TrackPx {
  readonly offset: number;
  readonly size: number;
}

interface TrackDrag {
  readonly px: readonly number[];
  readonly words: readonly string[];
}

interface Box {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

const BASE = "base";

const MIN_TRACK_PX = 16;

const DEFAULT_TRACK = "1fr";

const ROUND = 100;

const LINE_MAX = 100;

const SLOT_MODES: ReadonlySet<string> = new Set([
  "block",
  "flex",
  "inline-flex",
]);

const toBreakpoint = (variant: string): string => {
  const parsed = parseVariant(variant);

  if (parsed === null || parsed.breakpoint === null) {
    return BASE;
  }

  return parsed.breakpoint;
};

const toDepthStep = (depth: number, char: string): number => {
  if (char === "(") {
    return depth + 1;
  }

  if (char === ")") {
    return Math.max(0, depth - 1);
  }

  return depth;
};

const toWords = (text: string): string[] => {
  const words: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text.trim()) {
    depth = toDepthStep(depth, char);

    if (/\s/u.test(char) && depth === 0) {
      words.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  words.push(current);

  return words.filter((word) => word !== "");
};

const toTracksText = (words: readonly string[]): string => {
  const [first = DEFAULT_TRACK] = words;

  if (words.length > 1 && words.every((word) => word === first)) {
    return `repeat(${words.length}, ${first})`;
  }

  return words.join(" ");
};

const toAddedText = (words: readonly string[]): string => {
  const last = words.at(-1) ?? DEFAULT_TRACK;

  return toTracksText([...words, last]);
};

const toRemovedText = (words: readonly string[]): string | null => {
  if (words.length <= 1) {
    return null;
  }

  return toTracksText(words.slice(0, -1));
};

const toPx = (value: string | undefined): number => {
  const parsed = Number(value?.replace("px", "") ?? "");

  if (value && Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
};

const toPxList = (computed: string | undefined): number[] => {
  const values = (computed ?? "").trim().split(/\s+/u);

  if (!values.every((value) => value.endsWith("px"))) {
    return [];
  }

  return values.map((value) => toPx(value));
};

const toBox = (computed: string | undefined): Box => {
  const parts = (computed ?? "")
    .trim()
    .split(/\s+/u)
    .map((value) => toPx(value));

  const [top = 0, right = top, bottom = top, left = right] = parts;

  return { bottom, left, right, top };
};

const toOffsets = (px: readonly number[], gap: number): TrackPx[] => {
  let offset = 0;

  return px.map((size) => {
    const track = { offset, size };

    offset += size + gap;

    return track;
  });
};

const toRounded = (value: number): number => Math.round(value * ROUND) / ROUND;

const toScaledWord = (word: string, before: number, after: number): string => {
  const amount = Number(word.replace("fr", ""));

  if (word.endsWith("fr") && Number.isFinite(amount) && before > 0) {
    return `${toRounded((amount * after) / before)}fr`;
  }

  return `${Math.round(after)}px`;
};

const toDragged = (
  words: readonly string[],
  px: readonly number[],
  index: number,
  delta: number
): TrackDrag => {
  const before = px[index] ?? 0;
  const next = px[index + 1] ?? 0;
  const low = MIN_TRACK_PX - before;
  const high = next - MIN_TRACK_PX;
  const move = Math.min(Math.max(delta, low), Math.max(low, high));

  const sizes = px.map((size, at) => {
    if (at === index) {
      return size + move;
    }

    if (at === index + 1) {
      return size - move;
    }

    return size;
  });

  const changed = words.map((word, at) => {
    if (at === index || at === index + 1) {
      return toScaledWord(word, px[at] ?? 0, sizes[at] ?? 0);
    }

    return word;
  });

  return { px: sizes, words: changed };
};

const toTrackWords = (
  info: GridInfo,
  axis: GridAxis,
  computed: readonly number[]
): string[] => {
  const authored = info[axis].tracks;

  if (authored.length === computed.length) {
    return [...authored];
  }

  return computed.map((size) => `${toRounded(size)}px`);
};

const isGridDisplay = (display: string | undefined): boolean =>
  (display ?? "").includes("grid");

const isGridItem = (target: SelectionContext): boolean =>
  isGridDisplay(target.styles["parent-display"]);

const isGridLayer = (target: SelectionContext): boolean =>
  isGridDisplay(target.styles.display);

const canBecomeGrid = (target: SelectionContext): boolean =>
  SLOT_MODES.has(target.styles.display ?? "");

const toLineValue = (raw: string): number | null | "invalid" => {
  const text = raw.trim();

  if (text === "") {
    return null;
  }

  const value = Number(text);

  if (!Number.isInteger(value) || value < 1 || value > LINE_MAX) {
    return "invalid";
  }

  return value;
};

const toLineText = (value: number | null): string => {
  if (value === null) {
    return "";
  }

  return String(value);
};

export {
  MIN_TRACK_PX,
  canBecomeGrid,
  isGridItem,
  isGridLayer,
  toAddedText,
  toBox,
  toBreakpoint,
  toDragged,
  toLineText,
  toLineValue,
  toOffsets,
  toPx,
  toPxList,
  toRemovedText,
  toTrackWords,
  toTracksText,
  toWords,
};

export type { Box, GridAxis, LineKey, TrackDrag, TrackPx };
