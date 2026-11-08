import { toSummary } from "./pattern-model.js";
import type { PatternSummary, StoredPattern } from "./pattern-model.js";

interface ListCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly query: string | null;
  readonly tag: string | null;
}

interface PatternPage {
  readonly items: readonly PatternSummary[];
  readonly next: string | null;
}

const isMatch = (pattern: StoredPattern, command: ListCommand): boolean => {
  if (
    command.tag !== null &&
    !pattern.tags.includes(command.tag.toLowerCase())
  ) {
    return false;
  }

  if (command.query === null) {
    return true;
  }

  const query = command.query.toLowerCase();

  return [pattern.name, pattern.sourceName, ...pattern.tags].some((text) =>
    text.toLowerCase().includes(query)
  );
};

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toPatternPage = (
  all: readonly StoredPattern[],
  command: ListCommand
): PatternPage => {
  const kept = all.filter((pattern) => isMatch(pattern, command));
  const start = toStart(command.cursor);

  const items = kept
    .slice(start, start + command.limit)
    .map((pattern) => toSummary(pattern));

  const end = start + items.length;
  let next: string | null = null;

  if (end < kept.length) {
    next = String(end);
  }

  return { items, next };
};

export { toPatternPage };

export type { ListCommand, PatternPage };
