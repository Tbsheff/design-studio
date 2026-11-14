import { readFile } from "node:fs/promises";
import path from "node:path";

import { boundEventBus } from "../events/index.js";
import {
  hasDraftBase,
  setDraftBase,
  setDraftComplete,
  setDraftText,
} from "../run-log/index.js";

type DraftKind = "edit" | "write";

interface DraftTarget {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly workTree: string;
}

interface DraftKey {
  readonly kind: DraftKind;
  readonly oldString: string | null;
  readonly path: string;
  readonly toolUseId: string;
}

interface PendingWrite {
  readonly path: string;
  readonly target: DraftTarget;
  text: string;
  readonly toolUseId: string;
  timer: ReturnType<typeof setTimeout> | null;
}

const EMIT_MS = 250;

const pending = new Map<string, PendingWrite>();

const publishPending = (toolUseId: string): void => {
  const write = pending.get(toolUseId) ?? null;

  if (write === null) {
    return;
  }

  if (write.timer !== null) {
    clearTimeout(write.timer);
  }

  pending.delete(toolUseId);

  if (write.text === "") {
    return;
  }

  boundEventBus()?.emit({
    directionId: write.target.directionId,
    path: write.path,
    projectId: write.target.projectId,
    runId: write.target.runId,
    text: write.text,
    toolUseId: write.toolUseId,
    type: "run.write.delta",
  });
};

const toPendingWrite = (
  draftTarget: DraftTarget,
  toolUseId: string,
  filePath: string
): PendingWrite => {
  const existing = pending.get(toolUseId) ?? null;

  if (existing !== null) {
    return existing;
  }

  const write: PendingWrite = {
    path: filePath,
    target: draftTarget,
    text: "",
    timer: null,
    toolUseId,
  };

  pending.set(toolUseId, write);

  return write;
};

const toFileText = async (absolute: string): Promise<string | null> => {
  try {
    return await readFile(absolute, "utf-8");
  } catch {
    return null;
  }
};

const setFileBase = async (
  target: DraftTarget,
  filePath: string
): Promise<void> => {
  const text = await toFileText(path.resolve(target.workTree, filePath));

  setDraftBase({ path: filePath, runId: target.runId, text });
};

const startDraftBase = (target: DraftTarget, filePath: string): void => {
  if (hasDraftBase(target.runId, filePath)) {
    return;
  }

  setDraftBase({ path: filePath, runId: target.runId, text: null });
  void setFileBase(target, filePath);
};

const insertDraftChunk = (
  target: DraftTarget,
  key: DraftKey,
  chunk: string
): void => {
  if (chunk === "") {
    return;
  }

  setDraftText({
    kind: key.kind,
    oldString: key.oldString,
    path: key.path,
    projectId: target.projectId,
    runId: target.runId,
    text: chunk,
    toolUseId: key.toolUseId,
  });

  const write = toPendingWrite(target, key.toolUseId, key.path);

  write.text += chunk;
  write.timer ??= setTimeout(() => publishPending(key.toolUseId), EMIT_MS);
};

const stopDraft = (
  target: DraftTarget,
  toolUseId: string,
  isReplaceAll: boolean
): void => {
  publishPending(toolUseId);
  setDraftComplete(target.runId, toolUseId, isReplaceAll);
};

export { stopDraft, insertDraftChunk, startDraftBase };

export type { DraftKey, DraftKind, DraftTarget };
