import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";

import type { DriverInput } from "./lifecycle.js";
import {
  insertDraftChunk,
  startDraftBase,
  stopDraft,
} from "./run-draft-feed.js";
import type { DraftKey, DraftTarget } from "./run-draft-feed.js";

interface EditSpan {
  readonly start: number;
  readonly oldEnd: number;
  readonly newEnd: number;
}

interface EditStrings {
  readonly newString: string;
  readonly oldString: string;
}

const DRAFT_PARTS = 4;

const DRAFT_STEP_MS = 1200;

const HTML_FILE = /\.html?$/iu;

const toFileText = async (absolute: string): Promise<string | null> => {
  try {
    return await readFile(absolute, "utf-8");
  } catch {
    return null;
  }
};

const toPrefixSize = (before: string, after: string): number => {
  const limit = Math.min(before.length, after.length);
  let size = 0;

  while (size < limit && before[size] === after[size]) {
    size += 1;
  }

  return size;
};

const toSuffixSize = (
  before: string,
  after: string,
  prefix: number
): number => {
  const limit = Math.min(before.length, after.length) - prefix;
  let size = 0;

  while (
    size < limit &&
    before[before.length - 1 - size] === after[after.length - 1 - size]
  ) {
    size += 1;
  }

  return size;
};

const toLineStart = (text: string, at: number): number =>
  text.lastIndexOf("\n", Math.max(0, at - 1)) + 1;

const toLineEnd = (text: string, at: number): number => {
  const next = text.indexOf("\n", at);

  if (next === -1) {
    return text.length;
  }

  return next + 1;
};

const toWiderSpan = (before: string, span: EditSpan): EditSpan => {
  const start = toLineStart(before, Math.max(0, span.start - 1));
  const oldEnd = toLineEnd(before, span.oldEnd);

  return { newEnd: span.newEnd + oldEnd - span.oldEnd, oldEnd, start };
};

const isUniqueSpan = (before: string, span: EditSpan): boolean => {
  const old = before.slice(span.start, span.oldEnd);

  return old !== "" && before.indexOf(old) === before.lastIndexOf(old);
};

const toEditStrings = (before: string, after: string): EditStrings => {
  const prefix = toPrefixSize(before, after);
  const suffix = toSuffixSize(before, after, prefix);
  const start = toLineStart(before, prefix);
  const oldEnd = toLineEnd(before, before.length - suffix);

  let span: EditSpan = {
    newEnd: after.length - (before.length - oldEnd),
    oldEnd,
    start,
  };

  while (
    !isUniqueSpan(before, span) &&
    (span.start > 0 || span.oldEnd < before.length)
  ) {
    span = toWiderSpan(before, span);
  }

  return {
    newString: after.slice(span.start, span.newEnd),
    oldString: before.slice(span.start, span.oldEnd),
  };
};

const toDraftParts = (content: string): string[] => {
  const size = Math.ceil(content.length / DRAFT_PARTS);
  const parts: string[] = [];

  for (let start = 0; start < content.length; start += size) {
    parts.push(content.slice(start, start + size));
  }

  return parts;
};

const toDraftTarget = (input: DriverInput): DraftTarget => ({
  directionId: input.ctx.direction.id,
  projectId: input.ctx.project.id,
  runId: input.runId,
  workTree: input.ctx.direction.workTree,
});

const runDraftStream = async (
  input: DriverInput,
  key: DraftKey,
  content: string
): Promise<void> => {
  const target = toDraftTarget(input);
  const parts = toDraftParts(content);

  await Promise.all(
    parts.map(async (part, index) => {
      await wait(index * DRAFT_STEP_MS, null, { signal: input.signal });
      insertDraftChunk(target, key, part);
    })
  );
  await wait(DRAFT_STEP_MS, null, { signal: input.signal });

  stopDraft(target, key.toolUseId, false);
};

const runDraftEdit = async (
  input: DriverInput,
  toolUseId: string,
  relativePath: string,
  strings: EditStrings
): Promise<void> => {
  startDraftBase(toDraftTarget(input), relativePath);
  await runDraftStream(
    input,
    {
      kind: "edit",
      oldString: strings.oldString,
      path: relativePath,
      toolUseId,
    },
    strings.newString
  );
};

const runDraftWrite = async (
  input: DriverInput,
  toolUseId: string,
  relativePath: string,
  content: string
): Promise<void> => {
  input.signal.throwIfAborted();
  const absolute = path.resolve(input.ctx.direction.workTree, relativePath);

  const before = await toFileText(absolute);

  if (before === null) {
    await runDraftStream(
      input,
      { kind: "write", oldString: null, path: relativePath, toolUseId },
      content
    );
  }

  if (before !== null && HTML_FILE.test(relativePath) && before !== content) {
    await runDraftEdit(
      input,
      toolUseId,
      relativePath,
      toEditStrings(before, content)
    );
  }

  await writeFile(absolute, content);
};

export { runDraftWrite };
