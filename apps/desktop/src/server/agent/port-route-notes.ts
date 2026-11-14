import path from "node:path";

import {
  FOLDER_TAG,
  getText,
  toDataReads,
  toRouteFileNow,
} from "./port-route-update.js";
import type { RouteFileText } from "./port-route-update.js";

interface BlockNote {
  readonly kept: number;
  readonly names: readonly string[];
  readonly total: number;
}

const UPDATE_OPEN = ["<", 'route-update file="'].join("");

const FOLDER_HEAD_END = '">\n';

const toReadsText = (kept: number, total: number): string => {
  if (total === 1 && kept === 1) {
    return "kept 1 data read";
  }

  if (kept === total) {
    return `kept ${total} data reads`;
  }

  return `kept ${kept} of ${total} data reads`;
};

const toFolderFilesBefore = (prompt: string): RouteFileText[] =>
  prompt
    .split(`<${FOLDER_TAG} file="`)
    .slice(1)
    .flatMap((part) => {
      const head = part.indexOf(FOLDER_HEAD_END);
      const end = part.indexOf(`\n</${FOLDER_TAG}>`);

      if (head === -1 || end === -1) {
        return [];
      }

      return [
        {
          file: part.slice(0, head),
          text: part.slice(head + FOLDER_HEAD_END.length, end),
        },
      ];
    });

interface FileReads {
  readonly isChanged: boolean;
  readonly kept: number;
  readonly total: number;
}

const toFileReads = (before: string, after: string): FileReads => {
  const reads = [...toDataReads(before)];
  const now = toDataReads(after);

  return {
    isChanged: before !== after,
    kept: reads.filter((name) => now.has(name)).length,
    total: reads.length,
  };
};

const toFileList = (names: readonly string[]): string => {
  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
};

const listRouteBlocks = (prompt: string): string[] =>
  prompt
    .split(UPDATE_OPEN)
    .slice(1)
    .map((part) => `${UPDATE_OPEN}${part}`);

const toBlockFile = (block: string): string =>
  block.slice(UPDATE_OPEN.length, block.indexOf('">'));

const toBlockNote = async (
  block: string,
  workTree: string
): Promise<BlockNote | null> => {
  const before = toRouteFileNow(block);

  if (before === null) {
    return null;
  }

  const files: RouteFileText[] = [before, ...toFolderFilesBefore(block)];

  const afters = await Promise.all(
    files.map(
      async (item) => (await getText(path.join(workTree, item.file))) ?? ""
    )
  );

  const reads = files.map((item, index) =>
    toFileReads(item.text, afters[index] ?? "")
  );

  const changed = files.slice(1).flatMap((item, index) => {
    if (reads[index + 1]?.isChanged === true) {
      return [path.basename(item.file)];
    }

    return [];
  });

  return {
    kept: reads.reduce((sum, item) => sum + item.kept, 0),
    names: [before.file, ...changed],
    total: reads.reduce((sum, item) => sum + item.total, 0),
  };
};

const toRouteUpdateNotes = async (
  prompt: string,
  workTree: string
): Promise<string[]> => {
  const blocks = listRouteBlocks(prompt);

  const notes = await Promise.all(
    blocks.map((block) => toBlockNote(block, workTree))
  );

  if (notes.every((note) => note === null)) {
    return [];
  }

  const names = notes.flatMap((note, index) => {
    if (note === null) {
      return [toBlockFile(blocks[index] ?? "")];
    }

    return note.names;
  });

  const kept = notes.reduce((sum, note) => sum + (note?.kept ?? 0), 0);
  const total = notes.reduce((sum, note) => sum + (note?.total ?? 0), 0);

  return [
    `Updated ${toFileList([...new Set(names)])} (${toReadsText(kept, total)}).`,
  ];
};

export { toRouteUpdateNotes };
