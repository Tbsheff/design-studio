import { DRAFT_HTML_MAX_BYTES } from "@design-studio/actions/run/draft/schema";
import type { RunDraft } from "@design-studio/actions/run/draft/schema";

type DraftKind = RunDraft["kind"];

interface DraftEntry {
  readonly isComplete: boolean;
  readonly isReplaceAll: boolean;
  readonly kind: DraftKind;
  readonly oldString: string | null;
  readonly pageText: string | null;
  readonly path: string;
  readonly projectId: string;
  readonly text: string;
  readonly toolUseId: string;
}

interface DraftChunk {
  readonly kind: DraftKind;
  readonly oldString: string | null;
  readonly path: string;
  readonly projectId: string;
  readonly runId: string;
  readonly text: string;
  readonly toolUseId: string;
}

const RUN_CAP = 16;

const HTML_FILE = /\.html?$/iu;

interface DraftBase {
  readonly path: string;
  readonly runId: string;
  readonly text: string | null;
}

const drafts = new Map<string, DraftEntry>();

const bases = new Map<string, Map<string, string | null>>();

const encoder = new TextEncoder();

const decoder = new TextDecoder();

const toCappedHtml = (text: string): string => {
  const bytes = encoder.encode(text);

  if (bytes.length <= DRAFT_HTML_MAX_BYTES) {
    return text;
  }

  return decoder.decode(bytes.slice(0, DRAFT_HTML_MAX_BYTES));
};

const TAG = /\u003C(?<body>[^\u003C>]*)>/gu;

const TAG_NAME = /^\/?(?<name>[A-Za-z][\w-]*)/u;

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const toWholeTags = (text: string): string => {
  const open = text.lastIndexOf("\u003C");

  if (open > text.lastIndexOf(">")) {
    return text.slice(0, open);
  }

  return text;
};

const toOpenTags = (text: string): string[] => {
  const stack: string[] = [];

  for (const match of text.matchAll(TAG)) {
    const body = match.groups?.body ?? "";
    const name = TAG_NAME.exec(body)?.groups?.name?.toLowerCase() ?? "";
    const isClose = body.startsWith("/");

    const isSelf = body.endsWith("/") || VOID_TAGS.has(name) || name === "";

    if (isClose && stack.at(-1) === name) {
      stack.pop();
    }

    if (!isClose && !isSelf) {
      stack.push(name);
    }
  }

  return stack;
};

const toClosedPartial = (text: string): string => {
  const whole = toWholeTags(text);

  const closers = toOpenTags(whole)
    .toReversed()
    .map((name) => `\u003C/${name}>`);

  return `${whole}${closers.join("")}`;
};

const toBaseText = (runId: string, filePath: string): string | null =>
  bases.get(runId)?.get(filePath) ?? null;

const toEditText = (runId: string, entry: DraftEntry): string | null => {
  const base = toBaseText(runId, entry.path);
  const old = entry.oldString;

  if (base === null || old === null || old === "") {
    return null;
  }

  const at = base.indexOf(old);

  if (at === -1) {
    return null;
  }

  let middle = entry.text;

  if (!entry.isComplete) {
    middle = toClosedPartial(entry.text);
  }

  if (entry.isReplaceAll) {
    return base.replaceAll(old, () => middle);
  }

  if (base.lastIndexOf(old) !== at) {
    return null;
  }

  return `${base.slice(0, at)}${middle}${base.slice(at + old.length)}`;
};

const toPageText = (runId: string, entry: DraftEntry): string | null => {
  if (entry.pageText !== null) {
    return entry.pageText;
  }

  if (entry.kind === "edit") {
    return toEditText(runId, entry);
  }

  return entry.text;
};

const toDraftHtml = (runId: string, entry: DraftEntry): string | null => {
  if (!HTML_FILE.test(entry.path)) {
    return null;
  }

  const text = toPageText(runId, entry);

  if (text === null) {
    return null;
  }

  return toCappedHtml(text);
};

const deleteOldest = (): void => {
  const [oldest = null] = drafts.keys();

  if (oldest !== null && drafts.size > RUN_CAP) {
    drafts.delete(oldest);
  }

  const [oldestBase = null] = bases.keys();

  if (oldestBase !== null && bases.size > RUN_CAP) {
    bases.delete(oldestBase);
  }
};

const toRunBases = (runId: string): Map<string, string | null> => {
  const existing = bases.get(runId) ?? null;

  if (existing !== null) {
    return existing;
  }

  const created = new Map<string, string | null>();

  bases.set(runId, created);
  deleteOldest();

  return created;
};

const hasDraftBase = (runId: string, filePath: string): boolean =>
  bases.get(runId)?.has(filePath) ?? false;

const setDraftBase = (base: DraftBase): void => {
  const runBases = toRunBases(base.runId);

  if ((runBases.get(base.path) ?? null) === null) {
    runBases.set(base.path, base.text);
  }
};

const toPriorText = (chunk: DraftChunk): string => {
  const prior = drafts.get(chunk.runId) ?? null;

  if (prior === null || prior.toolUseId !== chunk.toolUseId) {
    return "";
  }

  return prior.text;
};

const setDraftText = (chunk: DraftChunk): void => {
  const fullText = `${toPriorText(chunk)}${chunk.text}`;

  drafts.delete(chunk.runId);
  drafts.set(chunk.runId, {
    isComplete: false,
    isReplaceAll: false,
    kind: chunk.kind,
    oldString: chunk.oldString,
    pageText: null,
    path: chunk.path,
    projectId: chunk.projectId,
    text: fullText,
    toolUseId: chunk.toolUseId,
  });
  deleteOldest();
};

const setDraftComplete = (
  runId: string,
  toolUseId: string,
  isReplaceAll: boolean
): void => {
  const entry = drafts.get(runId) ?? null;

  if (entry === null || entry.toolUseId !== toolUseId) {
    return;
  }

  const done = { ...entry, isComplete: true, isReplaceAll };
  const text = toPageText(runId, done);

  drafts.set(runId, { ...done, pageText: text });

  if (text !== null) {
    toRunBases(runId).set(entry.path, text);
  }
};

const toRunDraft = (projectId: string, runId: string): RunDraft | null => {
  const entry = drafts.get(runId) ?? null;

  if (entry === null || entry.projectId !== projectId) {
    return null;
  }

  return {
    bytes: encoder.encode(entry.text).length,
    html: toDraftHtml(runId, entry),
    isComplete: entry.isComplete,
    kind: entry.kind,
    path: entry.path,
  };
};

export {
  hasDraftBase,
  setDraftBase,
  setDraftComplete,
  setDraftText,
  toRunDraft,
};

export type { DraftBase, DraftChunk };
