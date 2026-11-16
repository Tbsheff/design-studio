import type { SelectionContext } from "@design-studio/contracts";

import { copy } from "./copy.js";

const SNIPPET_CHARS = 24;

const toSnippet = (selected: SelectionContext): string => {
  const text = selected.text?.trim() ?? "";

  if (text === "") {
    return "";
  }

  return `${copy.text}${text.slice(0, SNIPPET_CHARS)}`;
};

const toSelectionTag = (selection: readonly SelectionContext[]): string => {
  const [first] = selection;

  if (selection.length === 1 && first) {
    return first.tag;
  }

  return `${selection.length}${copy.layers}`;
};

const toSelectionSnippet = (selection: readonly SelectionContext[]): string => {
  const [first] = selection;

  if (selection.length === 1 && first) {
    return toSnippet(first);
  }

  return "";
};

const toSelectionTip = (selection: readonly SelectionContext[]): string =>
  selection.map((selected) => selected.selector).join("\n");

export { toSelectionSnippet, toSelectionTag, toSelectionTip };
