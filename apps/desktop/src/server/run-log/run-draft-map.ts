import { DRAFT_HTML_MAX_BYTES } from "@design-studio/actions/run/draft/schema";
import type { RunDraft } from "@design-studio/actions/run/draft/schema";

interface DraftEntry {
  readonly isComplete: boolean;
  readonly path: string;
  readonly projectId: string;
  readonly text: string;
  readonly toolUseId: string;
}

interface DraftChunk {
  readonly path: string;
  readonly projectId: string;
  readonly runId: string;
  readonly text: string;
  readonly toolUseId: string;
}

const RUN_CAP = 16;

const HTML_FILE = /\.html?$/iu;

const drafts = new Map<string, DraftEntry>();

const encoder = new TextEncoder();

const decoder = new TextDecoder();

const toCappedHtml = (text: string): string => {
  const bytes = encoder.encode(text);

  if (bytes.length <= DRAFT_HTML_MAX_BYTES) {
    return text;
  }

  return decoder.decode(bytes.slice(0, DRAFT_HTML_MAX_BYTES));
};

const toDraftHtml = (entry: DraftEntry): string | null => {
  if (!HTML_FILE.test(entry.path)) {
    return null;
  }

  return toCappedHtml(entry.text);
};

const deleteOldest = (): void => {
  const [oldest = null] = drafts.keys();

  if (oldest !== null && drafts.size > RUN_CAP) {
    drafts.delete(oldest);
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
    path: chunk.path,
    projectId: chunk.projectId,
    text: fullText,
    toolUseId: chunk.toolUseId,
  });
  deleteOldest();
};

const setDraftComplete = (runId: string, toolUseId: string): void => {
  const entry = drafts.get(runId) ?? null;

  if (entry !== null && entry.toolUseId === toolUseId) {
    drafts.set(runId, { ...entry, isComplete: true });
  }
};

const toRunDraft = (projectId: string, runId: string): RunDraft | null => {
  const entry = drafts.get(runId) ?? null;

  if (entry === null || entry.projectId !== projectId) {
    return null;
  }

  return {
    bytes: encoder.encode(entry.text).length,
    html: toDraftHtml(entry),
    isComplete: entry.isComplete,
    path: entry.path,
  };
};

export { setDraftText, setDraftComplete, toRunDraft };

export type { DraftChunk };
