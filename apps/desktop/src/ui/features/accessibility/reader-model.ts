import { copy } from "./copy.js";
import type {
  LinkQuery,
  WireOutput,
  listReaderLinesAccessibility,
} from "./deps.js";

type ReaderLine = WireOutput<
  typeof listReaderLinesAccessibility
>["items"][number];

interface ReaderRowView {
  readonly key: string;
  readonly line: ReaderLine;
  readonly text: string;
}

interface ReaderTargets {
  readonly idBySelector: ReadonlyMap<string, string>;
  readonly queries: readonly LinkQuery[];
}

const TEXT_ROLE = "text";

const toRoleText = (line: ReaderLine): string => {
  if (line.states.level !== null) {
    return copy.readerLevel(line.role, line.states.level);
  }

  return line.role;
};

const toStateTexts = (line: ReaderLine): string[] => {
  const texts: string[] = [];

  if (line.states.isChecked !== null) {
    texts.push(copy.readerChecked(line.states.isChecked));
  }

  if (line.states.isExpanded !== null) {
    texts.push(copy.readerExpanded(line.states.isExpanded));
  }

  if (line.states.isDisabled) {
    texts.push(copy.readerDisabled);
  }

  return texts;
};

const toReaderRowText = (line: ReaderLine): string => {
  if (line.role === TEXT_ROLE) {
    return line.name;
  }

  const parts = [toRoleText(line)];

  if (line.name !== "") {
    parts.push(line.name);
  }

  if (line.isNameMissing) {
    parts.push(copy.readerNoName);
  }

  return [...parts, ...toStateTexts(line)].join(", ");
};

const toReaderRows = (lines: readonly ReaderLine[]): ReaderRowView[] =>
  lines.map((line, index) => {
    const key = String(index);

    return { key, line, text: toReaderRowText(line) };
  });

const isTextLine = (line: ReaderLine): boolean => line.role === TEXT_ROLE;

const toReaderTargets = (lines: readonly ReaderLine[]): ReaderTargets => {
  const idBySelector = new Map<string, string>();

  for (const line of lines) {
    if (!idBySelector.has(line.selector)) {
      idBySelector.set(line.selector, `reader-${idBySelector.size}`);
    }
  }

  const queries = [...idBySelector].map(([selector, id]) => ({ id, selector }));

  return { idBySelector, queries };
};

export { isTextLine, toReaderRowText, toReaderRows, toReaderTargets };

export type { ReaderLine, ReaderRowView, ReaderTargets };
