import { copy } from "./copy.js";
import { chordMatches, readStored, writeStored } from "./deps.js";
import { IS_MAC } from "./keys.js";
import type { Row } from "./palette-row-types.js";

interface MarkedSegment {
  id: number;
  isMarked: boolean;
  text: string;
}

const RECENT_KEY = "design-studio.commands.recent.v1";
const RECENT_MAX = 5;

const readRecent = (): string[] => {
  try {
    const raw: unknown = JSON.parse(readStored(RECENT_KEY) ?? "[]");

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((id): id is string => typeof id === "string")
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
};

const noteRecent = (id: string): void => {
  const others = readRecent().filter((recentId) => recentId !== id);

  writeStored(RECENT_KEY, JSON.stringify([id, ...others].slice(0, RECENT_MAX)));
};

const toMarkedSegments = (text: string, marks: number[]): MarkedSegment[] => {
  const markSet = new Set(marks);
  const segments: MarkedSegment[] = [];

  let index = 0;

  for (const char of text) {
    const hit = markSet.has(index);
    const last = segments.at(-1);

    if (last && last.isMarked === hit) {
      last.text += char;
    } else {
      segments.push({ id: index, isMarked: hit, text: char });
    }

    index += 1;
  }

  return segments;
};

interface StepEvent {
  ctrlKey: boolean;
  key: string;
}

const toStep = (event: StepEvent): number => {
  if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
    return 1;
  }

  if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
    return -1;
  }

  return 0;
};

const toRecentRow = (event: KeyboardEvent, rows: Row[]): Row | null =>
  rows.find(
    (row) =>
      row.group === "Recent" &&
      Boolean(row.keys) &&
      chordMatches(row.keys ?? "", event, IS_MAC)
  ) ?? null;

const toGroupHeads = (rows: Row[]): (string | null)[] =>
  rows.map((row, index) => {
    if (rows[index - 1]?.group === row.group) {
      return null;
    }

    return row.group;
  });

const toActiveId = (listId: string, rows: Row[], current: number): string => {
  if (rows[current]) {
    return `${listId}-${current}`;
  }

  return "";
};

const toLoadingText = (isFiles: boolean): string => {
  if (isFiles) {
    return copy.textLoadingFiles;
  }

  return copy.textLoadingProjects;
};

const toEmptyText = (
  isLoading: boolean,
  query: string,
  isFiles: boolean
): string => {
  if (isLoading) {
    return toLoadingText(isFiles);
  }

  if (isFiles && query.trim() === "") {
    return copy.textNoFiles;
  }

  return `${copy.textNothingMatches}${query}${copy.textGlyph}`;
};

const toRowNote = (row: Row, isEnter: boolean): string | null => {
  if (row.disabled) {
    return row.disabled;
  }

  if (row.note && !isEnter) {
    return row.note;
  }

  return null;
};

export {
  noteRecent,
  readRecent,
  toActiveId,
  toEmptyText,
  toGroupHeads,
  toMarkedSegments,
  toRecentRow,
  toRowNote,
  toStep,
};

export type { MarkedSegment };
