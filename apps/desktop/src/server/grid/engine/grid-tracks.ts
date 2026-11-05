import { GRID_TRACK_EXPAND_MAX } from "./deps.js";

type TrackAxis = "columns" | "rows";

const SIMPLE_REPEAT = /^repeat\((?<count>\d+),minmax\(0,1fr\)\)$/u;

const SCALE_MAX: Readonly<Record<TrackAxis, number>> = {
  columns: 12,
  rows: 6,
};

const HEAD: Readonly<Record<TrackAxis, string>> = {
  columns: "grid-cols-",
  rows: "grid-rows-",
};

const toCompact = (text: string): string =>
  text
    .split(",")
    .map((part) => part.trim())
    .join(",")
    .replaceAll(/\s+/gu, " ");

const toDepthStep = (depth: number, char: string): number => {
  if (char === "(") {
    return depth + 1;
  }

  if (char === ")") {
    return Math.max(0, depth - 1);
  }

  return depth;
};

const toTopLevelWords = (text: string): string[] => {
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

interface RepeatParts {
  readonly body: string;
  readonly count: number;
}

const toRepeatParts = (word: string): RepeatParts | null => {
  const compact = toCompact(word);

  if (!compact.startsWith("repeat(") || !compact.endsWith(")")) {
    return null;
  }

  const inner = compact.slice("repeat(".length, -1);
  const comma = inner.indexOf(",");
  const count = Number(inner.slice(0, Math.max(comma, 0)));

  if (comma < 1 || !Number.isInteger(count)) {
    return null;
  }

  return { body: inner.slice(comma + 1), count };
};

const toTrackList = (text: string | null): string[] => {
  if (text === null) {
    return [];
  }

  return toTopLevelWords(text).flatMap((word) => {
    const parts = toRepeatParts(word);

    if (
      parts === null ||
      parts.count < 1 ||
      parts.count > GRID_TRACK_EXPAND_MAX
    ) {
      return [word];
    }

    const body = parts.body.replaceAll(",", ", ");

    return Array.from({ length: parts.count }, () => body);
  });
};

const toTrackClass = (axis: TrackAxis, text: string): string => {
  const compact = toCompact(text);
  const simple = SIMPLE_REPEAT.exec(compact);
  const count = Number(simple?.groups?.count ?? 0);

  if (compact === "none") {
    return `${HEAD[axis]}none`;
  }

  if (simple !== null && count >= 1 && count <= SCALE_MAX[axis]) {
    return `${HEAD[axis]}${count}`;
  }

  return `${HEAD[axis]}[${compact.replaceAll(" ", "_")}]`;
};

const toTrackText = (axis: TrackAxis, utility: string): string | null => {
  if (!utility.startsWith(HEAD[axis])) {
    return null;
  }

  const key = utility.slice(HEAD[axis].length);

  if (key === "none") {
    return "none";
  }

  if (key === "subgrid") {
    return "subgrid";
  }

  if (/^\d+$/u.test(key)) {
    return `repeat(${key}, minmax(0, 1fr))`;
  }

  if (key.startsWith("[") && key.endsWith("]")) {
    return key.slice(1, -1).replaceAll("_", " ");
  }

  return null;
};

const isTrackClass = (axis: TrackAxis, utility: string): boolean =>
  utility.startsWith(HEAD[axis]);

export { isTrackClass, toTrackClass, toTrackList, toTrackText };

export type { TrackAxis };
