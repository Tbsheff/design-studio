import type { PatchHunk } from "../../../shared/hunk.js";

interface LineBlock {
  readonly added: readonly number[];
  readonly at: number;
  readonly removed: readonly number[];
}

interface BlockDraft {
  readonly added: number[];
  readonly at: number;
  readonly removed: number[];
}

const toHunkBlocks = (hunk: PatchHunk): readonly LineBlock[] => {
  const blocks: LineBlock[] = [];
  let draft: BlockDraft | null = null;
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;

  for (const line of hunk.lines) {
    if (line.sign === " ") {
      if (draft) {
        blocks.push(draft);
        draft = null;
      }

      oldLine += 1;
      newLine += 1;
    } else if (line.sign === "+") {
      draft ??= { added: [], at: newLine, removed: [] };
      draft.added.push(newLine);
      newLine += 1;
    } else {
      draft ??= { added: [], at: newLine, removed: [] };
      draft.removed.push(oldLine);
      oldLine += 1;
    }
  }

  if (draft) {
    blocks.push(draft);
  }

  return blocks;
};

const toBlockLine = (
  blocks: readonly LineBlock[],
  line: number
): number | null => {
  for (const block of blocks) {
    const index = block.added.indexOf(line);

    if (index !== -1) {
      return block.removed[index] ?? null;
    }
  }

  return null;
};

const toHunkEndShift = (hunk: PatchHunk): number => {
  const removed = hunk.lines.filter((line) => line.sign === "-").length;
  const added = hunk.lines.filter((line) => line.sign === "+").length;

  return hunk.oldStart - hunk.newStart + removed - added;
};

const isInHunk = (hunk: PatchHunk, line: number): boolean => {
  const size = hunk.lines.filter((entry) => entry.sign !== "-").length;

  return line >= hunk.newStart && line < hunk.newStart + size;
};

const toContextLine = (hunk: PatchHunk, line: number): number | null => {
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;

  for (const entry of hunk.lines) {
    if (entry.sign === " " && newLine === line) {
      return oldLine;
    }

    if (entry.sign !== "+") {
      oldLine += 1;
    }

    if (entry.sign !== "-") {
      newLine += 1;
    }
  }

  return null;
};

const toFromLine = (
  hunks: readonly PatchHunk[],
  line: number
): number | null => {
  let shift = 0;

  for (const hunk of hunks) {
    if (line < hunk.newStart) {
      return line + hunk.oldStart - hunk.newStart;
    }

    if (isInHunk(hunk, line)) {
      return toBlockLine(toHunkBlocks(hunk), line) ?? toContextLine(hunk, line);
    }

    shift = toHunkEndShift(hunk);
  }

  return line + shift;
};

export { toFromLine, toHunkBlocks };

export type { LineBlock };
