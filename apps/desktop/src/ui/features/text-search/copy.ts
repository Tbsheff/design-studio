const FIND_TEXT_KEY = "find-text";

const copy = {
  caseSensitive: "Match case",
  close: "Close find",
  closeGlyph: "×",
  empty: "No text matches this search.",
  failed: "Could not search the text.",
  find: "Find",
  findHint: "Text to find",
  more: "Showing the first hits only. Make the search more exact.",
  needDirection: "Open a direction to find text",
  regex: "Use a regular expression",
  replace: "Replace",
  replaceAll: "Replace all",
  replaceHint: "New text",
  replacing: "Replacing…",
  searching: "Searching…",
  title: "Find and replace text",
  wholeWord: "Match whole word",
} as const;

const plural = (count: number, word: string): string => {
  if (count === 1) {
    return `${count} ${word}`;
  }

  return `${count} ${word}s`;
};

const countText = (hits: number, files: number): string =>
  `${plural(hits, "hit")} in ${plural(files, "file")}`;

const undoText = (updated: number, undoKey: string): string =>
  `Replaced ${plural(updated, "hit")}. Press ${undoKey} to undo.`;

const staleText = (stale: number): string =>
  `${plural(stale, "hit")} changed before the replace and stayed as they are.`;

export { copy, countText, FIND_TEXT_KEY, staleText, undoText };
