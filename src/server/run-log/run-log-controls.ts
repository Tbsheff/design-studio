import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RunSummary } from "../../shared/contracts.js";
import { RUN_TITLE_MAX } from "../../shared/rewind.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  assertSafeId,
} from "../store/errors.js";
import { createKeyedMutex } from "../store/mutex.js";
import type {
  ActiveRun,
  Decision,
  RunLogRuntime,
  StartRunCall,
} from "./run-log-runtime.js";

interface PermissionAnswer {
  readonly allow: boolean;
  readonly always?: string;
  readonly note?: string;
}

interface QueueItem {
  readonly id: string;
  readonly text: string;
}

interface RunAck {
  readonly ok: boolean;
}

interface TitleEdit {
  readonly file: string;
  readonly projectId: string;
  readonly runId: string;
  readonly title: string;
}

const titleLock = createKeyedMutex();

const ACK: RunAck = { ok: true };

const activeHandle = (runtime: RunLogRuntime, raw: string): ActiveRun => {
  const handle = runtime.runner.get(assertSafeId(raw, "runId"));

  if (!handle) {
    throw new NotFoundError("run is not active");
  }

  return handle;
};

const stopRun = (runtime: RunLogRuntime, runId: string): RunAck => {
  activeHandle(runtime, runId).cancel();

  return ACK;
};

const steerRun = (
  runtime: RunLogRuntime,
  runId: string,
  rawText: string
): RunAck => {
  const handle = activeHandle(runtime, runId);
  const text = rawText.trim();

  if (text === "") {
    throw new BadRequestError("text is required");
  }

  if (!handle.steer?.(text)) {
    throw new ConflictError("run_finished");
  }

  return ACK;
};

const setRunQueue = (
  runtime: RunLogRuntime,
  runId: string,
  items: readonly QueueItem[]
): RunAck => {
  const handle = activeHandle(runtime, runId);

  if (!handle.setQueue?.([...items])) {
    throw new ConflictError("run_finished");
  }

  return ACK;
};

const toDecision = (answer: PermissionAnswer): Decision => {
  if (answer.allow) {
    const allowed: Decision = { allow: true };

    if (answer.always) {
      allowed.always = answer.always;
    }

    return allowed;
  }

  const denied: Decision = { allow: false };
  const note = answer.note?.trim() ?? "";

  if (note !== "") {
    denied.note = note;
  }

  return denied;
};

const answerPermission = (
  runtime: RunLogRuntime,
  runId: string,
  requestId: string,
  answer: PermissionAnswer
): RunAck => {
  const handle = activeHandle(runtime, runId);

  if (!handle.answer?.(requestId, toDecision(answer))) {
    throw new NotFoundError("permission request is not open");
  }

  return ACK;
};

const readSummary = async (edit: TitleEdit): Promise<RunSummary> => {
  try {
    return JSON.parse(await readFile(edit.file, "utf-8")) as RunSummary;
  } catch {
    throw new NotFoundError(`run ${edit.runId} not found`);
  }
};

const withTitle = (current: RunSummary, title: string): RunSummary => {
  const next: RunSummary = { ...current };
  delete next.title;

  if (title !== "") {
    next.title = title;
  }

  return next;
};

const JSON_INDENT = 2;

const TEMP_BYTES = 4;

const rewriteTitle = async (
  runtime: RunLogRuntime,
  edit: TitleEdit
): Promise<RunSummary> => {
  const current = await readSummary(edit);

  if (
    current.status === "running" &&
    runtime.runner.isRunning(edit.projectId, current.directionId)
  ) {
    throw new ConflictError("run_in_progress");
  }

  const next = withTitle(current, edit.title);
  const suffix = randomBytes(TEMP_BYTES).toString("hex");
  const temp = `${edit.file}.${suffix}.tmp`;
  await writeFile(temp, `${JSON.stringify(next, null, JSON_INDENT)}\n`);
  await rename(temp, edit.file);

  return next;
};

const renameRun = async (
  runtime: RunLogRuntime,
  rawId: string,
  rawTitle: string
): Promise<RunSummary> => {
  const runId = assertSafeId(rawId, "runId");
  const title = rawTitle.trim();

  if (title.length > RUN_TITLE_MAX) {
    throw new BadRequestError(`title is longer than ${RUN_TITLE_MAX}`);
  }

  const projectId = await runtime.findRunProject(runId);

  if (projectId === null) {
    throw new NotFoundError(`run ${runId} not found`);
  }

  const file = path.join(runtime.runsDir(projectId), `${runId}.json`);

  return titleLock(runId, () =>
    rewriteTitle(runtime, { file, projectId, runId, title })
  );
};

const startRunCall = async (
  runtime: RunLogRuntime,
  input: StartRunCall
): Promise<{ runId: string }> => ({ runId: await runtime.startRun(input) });

export {
  answerPermission,
  renameRun,
  setRunQueue,
  startRunCall,
  steerRun,
  stopRun,
};

export type { RunAck };
