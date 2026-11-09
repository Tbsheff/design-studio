import type { SelectionContext } from "@design-studio/contracts";

const FOCUS_MAX = 20;

const DOT_SLASH = /^(?:\.\/)+/u;

const BACKSLASH = /\\/gu;

const toFocusPath = (raw: string): string | null => {
  const text = raw.trim().replaceAll(BACKSLASH, "/").replace(DOT_SLASH, "");

  if (
    text === "" ||
    text.startsWith("/") ||
    text.split("/").includes("..") ||
    text.includes("?file=")
  ) {
    return null;
  }

  return text;
};

const toFocusWith = (list: readonly string[], raw: string): string[] => {
  const path = toFocusPath(raw);

  if (path === null || list.includes(path) || list.length >= FOCUS_MAX) {
    return [...list];
  }

  return [...list, path];
};

const toFocusWithout = (list: readonly string[], path: string): string[] =>
  list.filter((item) => item !== path);

const toSelectionFocusPath = (
  selection: readonly SelectionContext[]
): string | null => {
  const first = selection[0] ?? null;

  if (first === null || first.source === null) {
    return null;
  }

  return toFocusPath(first.source.file);
};

const toFocusLabel = (path: string): string => path.split("/").pop() ?? path;

export {
  FOCUS_MAX,
  toFocusLabel,
  toFocusPath,
  toFocusWith,
  toFocusWithout,
  toSelectionFocusPath,
};
