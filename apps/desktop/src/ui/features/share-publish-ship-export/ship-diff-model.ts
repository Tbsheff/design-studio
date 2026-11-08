import type { ShipFile } from "@design-studio/contracts/ship";

import { copy } from "./copy.js";
import { pick } from "./pick.js";

const toEmptyDiffText = (file: ShipFile): string => {
  if (file.diff.includes("Binary files")) {
    return copy.binaryFileNoDiff;
  }

  return pick(
    file.status === "deleted",
    copy.fileIsDeleted,
    copy.noTextChanges
  );
};

interface DiffLine {
  readonly id: string;
  readonly text: string;
}

const toDiffLines = (file: ShipFile): DiffLine[] => {
  const all = file.diff.replace(/\n$/u, "").split("\n");
  const start = all.findIndex((line) => line.startsWith("@@"));

  if (start === -1) {
    return [{ id: "0", text: toEmptyDiffText(file) }];
  }

  return all.slice(start).map((text, index) => ({ id: String(index), text }));
};

const toDiffLineClass = (line: string): string => {
  if (line.startsWith("+")) {
    return "add";
  }

  if (line.startsWith("-")) {
    return "del";
  }

  return pick(line.startsWith("@@"), "hunk", "");
};

export { toDiffLineClass, toDiffLines };
