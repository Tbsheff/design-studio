import path from "node:path";

import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

import type { DriverInput } from "./lifecycle.js";
import { stopDraft, insertDraftChunk } from "./run-draft-feed.js";
import type { DraftTarget } from "./run-draft-feed.js";

interface BlockDraft {
  readonly contentKey: string;
  json: string;
  offset: number | null;
  isClosed: boolean;
  path: string | null;
  readonly toolUseId: string;
}

interface SafeEnd {
  readonly end: number;
  readonly isClosed: boolean;
}

type StreamEvent = Extract<SDKMessage, { type: "stream_event" }>["event"];

const CONTENT_KEYS = new Map([
  ["Edit", "new_string"],
  ["Write", "content"],
]);

const UNICODE_ESCAPE_SIZE = 6;

const SHORT_ESCAPE_SIZE = 2;

const FILE_PATH = /"file_path"\s*:\s*"(?<raw>(?:[^"\\]|\\.)*)"/u;

const JSON_ESCAPE = /\\(?:u[\dA-Fa-f]{4}|.)/gu;

const ESCAPES = new Map([
  ["b", "\b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
]);

const runs = new Map<string, Map<number, BlockDraft>>();

const toBlocks = (runId: string): Map<number, BlockDraft> => {
  const existing = runs.get(runId) ?? null;

  if (existing !== null) {
    return existing;
  }

  const blocks = new Map<number, BlockDraft>();

  runs.set(runId, blocks);

  return blocks;
};

const toTarget = (input: DriverInput): DraftTarget => ({
  directionId: input.ctx.direction.id,
  projectId: input.ctx.project.id,
  runId: input.runId,
});

const toEscapeSize = (raw: string, index: number): number => {
  if (raw[index + 1] === "u") {
    return UNICODE_ESCAPE_SIZE;
  }

  return SHORT_ESCAPE_SIZE;
};

const toSafeEnd = (raw: string, from: number): SafeEnd => {
  let index = from;

  while (index < raw.length) {
    const char = raw[index];

    if (char === '"') {
      return { end: index, isClosed: true };
    }

    if (char === "\\") {
      const size = toEscapeSize(raw, index);

      if (index + size > raw.length) {
        return { end: index, isClosed: false };
      }

      index += size;
    } else {
      index += 1;
    }
  }

  return { end: raw.length, isClosed: false };
};

const toUnescaped = (sequence: string): string => {
  const kind = sequence.charAt(1);

  if (kind === "u") {
    return String.fromCodePoint(Number.parseInt(sequence.slice(2), 16));
  }

  return ESCAPES.get(kind) ?? kind;
};

const fromJsonString = (raw: string): string =>
  raw.replaceAll(JSON_ESCAPE, (sequence) => toUnescaped(sequence));

const toRelativePath = (input: DriverInput, raw: string): string | null => {
  const absolute = path.resolve(
    input.ctx.direction.workTree,
    fromJsonString(raw)
  );

  const relative = path.relative(input.ctx.direction.workTree, absolute);

  if (relative === "" || relative.startsWith("..")) {
    return null;
  }

  return relative.split(path.sep).join("/");
};

const toContentOffset = (block: BlockDraft): number | null => {
  if (block.offset !== null) {
    return block.offset;
  }

  const match = new RegExp(`"${block.contentKey}"\\s*:\\s*"`, "u").exec(
    block.json
  );

  if (match === null) {
    return null;
  }

  return match.index + match[0].length;
};

const toBlockPath = (input: DriverInput, block: BlockDraft): string | null => {
  if (block.path !== null) {
    return block.path;
  }

  const raw = FILE_PATH.exec(block.json)?.groups?.raw ?? null;

  if (raw === null) {
    return null;
  }

  return toRelativePath(input, raw);
};

const toNewText = (input: DriverInput, block: BlockDraft): string => {
  block.path = toBlockPath(input, block);

  const offset = toContentOffset(block);

  if (offset === null || block.isClosed || block.path === null) {
    return "";
  }

  const safe = toSafeEnd(block.json, offset);

  block.offset = safe.end;
  block.isClosed = safe.isClosed;

  return fromJsonString(block.json.slice(offset, safe.end));
};

const startBlock = (input: DriverInput, event: StreamEvent): void => {
  if (event.type !== "content_block_start") {
    return;
  }

  const block = event.content_block;

  if (block.type !== "tool_use") {
    return;
  }

  const contentKey = CONTENT_KEYS.get(block.name) ?? null;

  if (contentKey === null) {
    return;
  }

  toBlocks(input.runId).set(event.index, {
    contentKey,
    isClosed: false,
    json: "",
    offset: null,
    path: null,
    toolUseId: block.id,
  });
};

const updateBlock = (input: DriverInput, event: StreamEvent): void => {
  if (
    event.type !== "content_block_delta" ||
    event.delta.type !== "input_json_delta"
  ) {
    return;
  }

  const block = runs.get(input.runId)?.get(event.index) ?? null;

  if (block === null) {
    return;
  }

  block.json += event.delta.partial_json;
  const text = toNewText(input, block);

  if (block.path !== null) {
    insertDraftChunk(toTarget(input), block.toolUseId, block.path, text);
  }
};

const stopBlock = (input: DriverInput, event: StreamEvent): void => {
  if (event.type !== "content_block_stop") {
    return;
  }

  const blocks = runs.get(input.runId) ?? null;
  const block = blocks?.get(event.index) ?? null;

  if (blocks === null || block === null) {
    return;
  }

  blocks.delete(event.index);
  stopDraft(toTarget(input), block.toolUseId);
};

const applyDraftMessage = (
  input: DriverInput,
  message: SDKMessage,
  forward: ((message: SDKMessage) => void) | null
): void => {
  forward?.(message);

  if (message.type === "result") {
    runs.delete(input.runId);
  }

  if (message.type !== "stream_event" || message.parent_tool_use_id) {
    return;
  }

  startBlock(input, message.event);
  updateBlock(input, message.event);
  stopBlock(input, message.event);
};

export { applyDraftMessage };
