import type { VersionChanges, VersionFileDiff } from "@design-studio/contracts";

import type { PatchHunk } from "../../../shared/hunk.js";
import { COPY } from "./copy.js";

interface DiffLine {
  readonly kind: "add" | "del" | "ctx";
  readonly newNo: number | null;
  readonly oldNo: number | null;
  readonly text: string;
}

interface ChangeTotals {
  readonly additions: number;
  readonly deletions: number;
  readonly more: number;
}

const OPEN_ALL_MAX = 8;

const toRow = (
  kind: DiffLine["kind"],
  newNo: number | null,
  oldNo: number | null,
  text: string
): DiffLine => ({ kind, newNo, oldNo, text });

const toHunkRows = (hunk: PatchHunk): DiffLine[] => {
  let newNo = hunk.newStart;
  let oldNo = hunk.oldStart;
  const rows: DiffLine[] = [];

  for (const line of hunk.lines) {
    const { text } = line;

    if (line.sign === "+") {
      rows.push(toRow("add", newNo, null, text));
      newNo += 1;
    } else if (line.sign === "-") {
      rows.push(toRow("del", null, oldNo, text));
      oldNo += 1;
    } else {
      rows.push(toRow("ctx", newNo, oldNo, text));
      newNo += 1;
      oldNo += 1;
    }
  }

  return rows;
};

const toStatusWord = (status: VersionFileDiff["status"]): string => {
  switch (status) {
    case "added": {
      return COPY.statusAdded;
    }

    case "removed": {
      return COPY.statusRemoved;
    }

    case "renamed": {
      return COPY.statusRenamed;
    }

    default: {
      return COPY.statusChanged;
    }
  }
};

const canReview = (file: VersionFileDiff, hunk: PatchHunk): boolean =>
  hunk.complete && file.status !== "removed";

const toLineClass = (kind: DiffLine["kind"]): string => {
  if (kind === "ctx") {
    return "diff-line ";
  }

  return `diff-line ${kind}`;
};

const toSign = (kind: DiffLine["kind"]): string => {
  if (kind === "add") {
    return "+";
  }

  if (kind === "del") {
    return "−";
  }

  return "";
};

const toFileName = (file: VersionFileDiff): string => {
  if (file.oldPath) {
    return `${file.oldPath} → ${file.path}`;
  }

  return file.path;
};

const toTotals = (changes: VersionChanges): ChangeTotals => {
  let additions = 0;
  let deletions = 0;

  for (const file of changes.files) {
    additions += file.additions;
    deletions += file.deletions;
  }

  return {
    additions,
    deletions,
    more: changes.totalFiles - changes.files.length,
  };
};

const toFilesChanged = (total: number): string => {
  if (total === 1) {
    return `${total} file ${COPY.summaryChanged}`;
  }

  return `${total} files ${COPY.summaryChanged}`;
};

export {
  OPEN_ALL_MAX,
  canReview,
  toFileName,
  toFilesChanged,
  toHunkRows,
  toLineClass,
  toSign,
  toStatusWord,
  toTotals,
};

export type { ChangeTotals, DiffLine };
