import { toItem } from "./theme-model.js";
import type { ThemeFile, ThemeItem } from "./theme-model.js";

interface ListCommand {
  readonly cursor: string | null;
  readonly limit: number;
}

interface ThemePage {
  readonly items: readonly ThemeItem[];
  readonly next: string | null;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toThemePage = (file: ThemeFile, command: ListCommand): ThemePage => {
  const start = toStart(command.cursor);

  const items = file.candidates
    .slice(start, start + command.limit)
    .map((stored) => toItem(stored, file.activeId));

  const end = start + items.length;
  let next: string | null = null;

  if (end < file.candidates.length) {
    next = String(end);
  }

  return { items, next };
};

export { toThemePage };

export type { ListCommand, ThemePage };
