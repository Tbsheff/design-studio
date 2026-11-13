import type { PageSourceFileDiff } from "@design-studio/actions/page/source/schema";
import type { DiffHunk, DiffLine } from "@design-studio/contracts";

import { diffLines } from "../../../../shared/line-diff.js";

const FILE_DIFFS_MAX = 50;

interface FileTextPair {
  readonly after: string | null;
  readonly before: string | null;
  readonly file: string;
}

const LINE_MARKS: Readonly<Record<DiffLine["kind"], string>> = {
  add: "+",
  del: "-",
  same: " ",
};

const toHunkText = (hunk: DiffHunk): string[] => [
  `@@ -${hunk.oldStart} +${hunk.newStart} @@`,
  ...hunk.lines.map((line) => `${LINE_MARKS[line.kind]}${line.text}`),
];

const toChange = (pair: FileTextPair): PageSourceFileDiff["change"] => {
  if (pair.before === null) {
    return "added";
  }

  if (pair.after === null) {
    return "deleted";
  }

  return "changed";
};

const toFileDiff = (pair: FileTextPair): PageSourceFileDiff[] => {
  if (pair.before === pair.after) {
    return [];
  }

  const diff = diffLines(pair.before ?? "", pair.after ?? "");

  return [
    {
      change: toChange(pair),
      diff: diff.hunks.flatMap((hunk) => toHunkText(hunk)).join("\n"),
      file: pair.file,
      isCut: diff.truncated,
    },
  ];
};

const toFileDiffs = (pairs: readonly FileTextPair[]): PageSourceFileDiff[] =>
  pairs.flatMap((pair) => toFileDiff(pair)).slice(0, FILE_DIFFS_MAX);

export { toFileDiffs };

export type { FileTextPair };
