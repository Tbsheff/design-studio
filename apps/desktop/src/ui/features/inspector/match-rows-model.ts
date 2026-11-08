import type { StyleValueRow } from "@design-studio/contracts/style-search";

import { ROWS_SHOWN } from "./match-scan.js";
import type { Scope } from "./match-scan.js";

interface RowActions {
  readonly selectValue: (row: StyleValueRow) => void;
  readonly selectClass: (row: StyleValueRow, cls: string) => void;
  readonly replace: (row: StyleValueRow) => void;
}

const SCOPES: readonly Scope[] = ["selection", "page"];

const SCOPE_LABEL: Record<Scope, string> = {
  page: "Page",
  selection: "Selection",
};

const toCountTip = (count: number): string => {
  if (count === 1) {
    return `${count} element`;
  }

  return `${count} elements`;
};

const toShownRows = (
  rows: StyleValueRow[],
  isAll: boolean
): StyleValueRow[] => {
  if (isAll) {
    return rows;
  }

  return rows.slice(0, ROWS_SHOWN);
};

const toMoreLabel = (isAll: boolean, count: number): string => {
  if (isAll) {
    return "Show fewer";
  }

  return `Show ${count - ROWS_SHOWN} more`;
};

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

const toStatusRole = (kind: string): string => {
  if (kind === "error") {
    return "alert";
  }

  return "status";
};

export {
  SCOPES,
  SCOPE_LABEL,
  toCountTip,
  toMoreLabel,
  toOnClass,
  toShownRows,
  toStatusRole,
};

export type { RowActions };
