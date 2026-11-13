import { boundEventBus } from "../events/index.js";
import { setDraftComplete, setDraftText } from "../run-log/index.js";

interface DraftTarget {
  readonly directionId: string;
  readonly projectId: string;
  readonly runId: string;
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

const insertDraftChunk = (
  target: DraftTarget,
  useId: string,
  filePath: string,
  chunk: string
): void => {
  if (chunk === "") {
    return;
  }

  setDraftText({
    path: filePath,
    projectId: target.projectId,
    runId: target.runId,
    text: chunk,
    toolUseId: useId,
  });

  const write = toPendingWrite(target, useId, filePath);

  write.text += chunk;
  write.timer ??= setTimeout(() => publishPending(useId), EMIT_MS);
};

const stopDraft = (target: DraftTarget, toolUseId: string): void => {
  publishPending(toolUseId);
  setDraftComplete(target.runId, toolUseId);
};

export { stopDraft, insertDraftChunk };

export type { DraftTarget };
