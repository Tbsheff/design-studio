import type { DiffHunk } from "@design-studio/contracts";

interface DiffRow {
  readonly key: number;
  readonly kind: "add" | "del" | "same";
  readonly newNo: string;
  readonly oldNo: string;
  readonly reader: string;
  readonly sign: string;
  readonly text: string;
}

const SIGN: Record<DiffRow["kind"], string> = {
  add: "+",
  del: "−",
  same: " ",
};

const READER: Record<DiffRow["kind"], string> = {
  add: "Added: ",
  del: "Removed: ",
  same: "",
};

const toLineNumber = (isHidden: boolean, line: number): string => {
  if (isHidden) {
    return "";
  }

  return String(line);
};

const toDiffRows = (hunk: DiffHunk): DiffRow[] => {
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;

  return hunk.lines.map((line, key) => {
    if (line.kind !== "add") {
      oldLine += 1;
    }

    if (line.kind !== "del") {
      newLine += 1;
    }

    return {
      key,
      kind: line.kind,
      newNo: toLineNumber(line.kind === "del", newLine),
      oldNo: toLineNumber(line.kind === "add", oldLine),
      reader: READER[line.kind],
      sign: SIGN[line.kind],
      text: line.text || " ",
    };
  });
};

export { toDiffRows };

export type { DiffRow };
