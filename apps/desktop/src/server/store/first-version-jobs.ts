import { setTimeout as sleep } from "node:timers/promises";

import type { AnyAction } from "@design-studio/actions/_core/action";
import type { FirstVersionState } from "@design-studio/contracts";

const MS_PER_FILE = 1.2;
const BASE_MS = 4000;
const MIN_ETA_S = 2;
const OVERDUE_ETA_S = 5;
const UNKNOWN_FILES = 20_000;
const MS_PER_S = 1000;

interface Job {
  readonly startedAt: number;
  readonly files: number | null;
  readonly estimateMs: number;
  readonly done: Promise<null>;
}

const DIRECTION_PATH = "/d/:directionId/";

const SOURCE_READS: ReadonlySet<string> = new Set([
  "direct-edit.getTree",
  "version.list",
]);

const jobs = new Map<string, Job>();
const failures = new Map<string, string>();

const toFirstVersionEstimateMs = (files: number | null): number =>
  BASE_MS + Math.round((files ?? UNKNOWN_FILES) * MS_PER_FILE);

const runSave = async <Saved>(
  projectId: string,
  save: () => Promise<Saved>
): Promise<null> => {
  try {
    await save();
  } catch (error) {
    if (error instanceof Error) {
      failures.set(projectId, error.message);

      return null;
    }

    failures.set(projectId, String(error));
  }

  return null;
};

const deleteJob = async (projectId: string, job: Job): Promise<void> => {
  await job.done;

  if (jobs.get(projectId) === job) {
    jobs.delete(projectId);
  }
};

const startFirstVersion = <Saved>(
  projectId: string,
  files: number | null,
  save: () => Promise<Saved>
): void => {
  if (jobs.has(projectId)) {
    return;
  }

  failures.delete(projectId);

  const done = runSave(projectId, save);
  const estimateMs = toFirstVersionEstimateMs(files);
  const startedAt = Date.now();
  const job: Job = { done, estimateMs, files, startedAt };

  jobs.set(projectId, job);

  void deleteJob(projectId, job);
};

const toFailedState = (message: string): FirstVersionState => ({
  elapsedMs: 0,
  error: message,
  etaSeconds: 0,
  files: null,
  pending: false,
  startedAt: null,
});

const toEtaSeconds = (leftMs: number): number => {
  if (leftMs > 0) {
    return Math.max(MIN_ETA_S, Math.ceil(leftMs / MS_PER_S));
  }

  return OVERDUE_ETA_S;
};

const toFirstVersionState = (projectId: string): FirstVersionState | null => {
  const job = jobs.get(projectId);

  if (!job) {
    const error = failures.get(projectId);

    if (error) {
      return toFailedState(error);
    }

    return null;
  }

  const elapsedMs = Date.now() - job.startedAt;

  return {
    elapsedMs,
    error: null,
    etaSeconds: toEtaSeconds(job.estimateMs - elapsedMs),
    files: job.files,
    pending: true,
    startedAt: job.startedAt,
  };
};

const isFirstVersionRunning = (projectId: string): boolean =>
  jobs.has(projectId);

const isFirstVersionFailed = (projectId: string): boolean =>
  failures.has(projectId);

const toTimeout = async (
  timeoutMs: number,
  signal: AbortSignal
): Promise<boolean> => {
  try {
    return await sleep(timeoutMs, false, { signal });
  } catch {
    return !signal.aborted;
  }
};

const toJobDone = async (job: Job): Promise<boolean> => {
  await job.done;

  return true;
};

const isFirstVersionDone = async (
  projectId: string,
  timeoutMs: number
): Promise<boolean> => {
  const job = jobs.get(projectId);

  if (!job) {
    return true;
  }

  const abort = new AbortController();

  const isFinished = await Promise.race([
    toJobDone(job),
    toTimeout(timeoutMs, abort.signal),
  ]);

  abort.abort();

  return isFinished;
};

const toFilesText = (files: number | null): string => {
  if (files) {
    return ` (${files.toLocaleString("en-US")} files)`;
  }

  return "";
};

const toFirstVersionWaitText = (projectId: string): string => {
  const state = toFirstVersionState(projectId);

  if (state?.error) {
    return `The first version of this app could not be saved: ${state.error}`;
  }

  if (!state) {
    return "The first version of this app is not saved yet. Try again in a few seconds.";
  }

  return `The studio is still saving the first version of this app${toFilesText(state.files)}, so it can undo your edits. It should be ready in about ${state.etaSeconds} s. Call this tool again then. Screenshots and file reads work now.`;
};

const isProjectWrite = (action: AnyAction): boolean =>
  action.access !== "read" &&
  action.scope === "project" &&
  action.needs === "project.update";

const isSourceWrite = (action: AnyAction): boolean =>
  action.http.path.includes(DIRECTION_PATH) ||
  action.invalidates.some((id) => SOURCE_READS.has(id));

const isFirstVersionWrite = (action: AnyAction): boolean =>
  isProjectWrite(action) && isSourceWrite(action);

export {
  isFirstVersionDone,
  isFirstVersionWrite,
  isFirstVersionFailed,
  isFirstVersionRunning,
  startFirstVersion,
  toFirstVersionEstimateMs,
  toFirstVersionState,
  toFirstVersionWaitText,
};
