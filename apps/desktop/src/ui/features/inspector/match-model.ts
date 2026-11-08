import type {
  StyleHit,
  StyleQuery,
  StyleValueRow,
} from "@design-studio/contracts/style-search";

import type { Scope } from "./match-scan-model.js";

interface MatchActions {
  readonly selectValue: (row: StyleValueRow) => void;
  readonly selectClass: (row: StyleValueRow, cls: string) => void;
  readonly replace: (row: StyleValueRow) => void;
}

const PAGE_QUERY: StyleQuery = {};

const NO_SOURCE_TEXT =
  "These elements have no source location, so they cannot be changed here.";

const toSelectedText = (count: number, total: number): string => {
  if (count === 0) {
    return "No element on this page has a source location for that value.";
  }

  if (total > count) {
    return `Selected ${count} of ${total} elements (the first ${count}).`;
  }

  if (count === 1) {
    return "Selected 1 element.";
  }

  return `Selected ${count} elements.`;
};

const toScopeQuery = (scope: Scope, selectors: string[]): StyleQuery => {
  if (scope === "page") {
    return PAGE_QUERY;
  }

  return { within: selectors };
};

const toMatchTitle = (scope: Scope, count: number): string => {
  if (scope === "page") {
    return "Page values";
  }

  if (count > 1) {
    return "Selection values";
  }

  return "Values";
};

const toReplaceLabel = (isPageWide: boolean): string => {
  if (isPageWide) {
    return "Replace on page with token…";
  }

  return "Replace in selection with token…";
};

const toEmptyText = (scope: Scope): string => {
  if (scope === "page") {
    return "No colors, sizes, radii or spacing found on this page.";
  }

  return "This selection sets no color, font size, radius or spacing of its own.";
};

const toTargetLabel = (targets: StyleHit[], isPageWide: boolean): string => {
  let where = " in the selection";

  if (isPageWide) {
    where = " on this page";
  }

  if (targets.length === 1) {
    return `1 element${where}`;
  }

  const count = new Set(targets.map((hit) => hit.selector)).size;

  return `${count} elements${where}`;
};

const toUnlocatedText = (unlocated: number): string => {
  if (unlocated > 0) {
    return `. ${unlocated} without a source location left as they are`;
  }

  return "";
};

export type { MatchActions };

export {
  NO_SOURCE_TEXT,
  PAGE_QUERY,
  toEmptyText,
  toMatchTitle,
  toReplaceLabel,
  toScopeQuery,
  toSelectedText,
  toTargetLabel,
  toUnlocatedText,
};
