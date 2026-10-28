import type { FirstVersionState, LegacyCanvasNotice, Project } from '../../shared/contracts.js';

const MS_PER_FILE = 1.2;
const BASE_MS = 4000;
const MIN_ETA_S = 2;
const OVERDUE_ETA_S = 5;

interface Job {
  startedAt: number;
  files: number | null;
  estimateMs: number;
  done: Promise<void>;
}

const jobs = new Map<string, Job>();
const failures = new Map<string, string>();

export function estimateFirstVersionMs(files: number | null): number {
  return BASE_MS + Math.round((files ?? 20_000) * MS_PER_FILE);
}

export function startFirstVersion(projectId: string, files: number | null, save: () => Promise<unknown>): void {
  if (jobs.has(projectId)) return;
  failures.delete(projectId);
  const done = save().then(
    () => undefined,
    (error: unknown) => {
      failures.set(projectId, error instanceof Error ? error.message : String(error));
    },
  );
  const job: Job = { startedAt: Date.now(), files, estimateMs: estimateFirstVersionMs(files), done };
  jobs.set(projectId, job);
  void done.finally(() => {
    if (jobs.get(projectId) === job) jobs.delete(projectId);
  });
}

export function firstVersionState(projectId: string): FirstVersionState | null {
  const job = jobs.get(projectId);
  if (!job) {
    const error = failures.get(projectId);
    return error ? { pending: false, startedAt: null, elapsedMs: 0, etaSeconds: 0, files: null, error } : null;
  }
  const elapsedMs = Date.now() - job.startedAt;
  const leftMs = job.estimateMs - elapsedMs;
  const etaSeconds = leftMs > 0 ? Math.max(MIN_ETA_S, Math.ceil(leftMs / 1000)) : OVERDUE_ETA_S;
  return { pending: true, startedAt: job.startedAt, elapsedMs, etaSeconds, files: job.files, error: null };
}

export function isFirstVersionRunning(projectId: string): boolean {
  return jobs.has(projectId);
}

export async function waitForFirstVersion(projectId: string, timeoutMs: number): Promise<boolean> {
  const job = jobs.get(projectId);
  if (!job) return true;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const finished = await Promise.race([job.done.then(() => true as const), timeout]);
  clearTimeout(timer);
  return finished;
}

export function firstVersionWaitText(projectId: string): string {
  const state = firstVersionState(projectId);
  if (state?.error) return `The first version of this app could not be saved: ${state.error}`;
  if (!state) return 'The first version of this app is not saved yet. Try again in a few seconds.';
  const files = state.files ? ` (${state.files.toLocaleString('en-US')} files)` : '';
  return `The studio is still saving the first version of this app${files}, so it can undo your edits. It should be ready in about ${state.etaSeconds} s. Call this tool again then. Screenshots and file reads work now.`;
}

export async function firstVersionBlock(project: { id: string; app?: unknown; directions: { headVersionId: string | null }[] }, waitMs: number): Promise<string | null> {
  if (!project.app || project.directions[0]?.headVersionId !== null) return null;
  const finished = await waitForFirstVersion(project.id, waitMs);
  return finished && !firstVersionState(project.id)?.error ? null : firstVersionWaitText(project.id);
}

export interface AttachResponse {
  project: Project;
  firstVersion: FirstVersionState | null;
  legacyCanvas: LegacyCanvasNotice | null;
}

function legacyCanvasNote(legacy: LegacyCanvasNotice): string {
  if (legacy.movedTo) return `An old ${legacy.file} from an earlier attach (${legacy.frames} frames) was moved to ${legacy.movedTo}. Nothing was deleted. The canvas starts empty.`;
  return `The old ${legacy.file} (${legacy.frames} frames) is tracked by your git, so it stays in place. The studio does not use it. The canvas starts empty.`;
}

export function attachReadiness(firstVersion: FirstVersionState | null, legacy: LegacyCanvasNotice | null): { ready: boolean; etaSeconds: number; firstVersion?: string; oldCanvas?: string } {
  const ready = !firstVersion?.pending && !firstVersion?.error;
  const notes: { firstVersion?: string; oldCanvas?: string } = {};
  if (firstVersion?.pending) notes.firstVersion = `The studio is saving the first version of the app in the background (about ${firstVersion.etaSeconds} s). get_screenshot, read_file and list_files work now. Edit tools wait up to 20 s for it, then say how long to wait.`;
  if (firstVersion?.error) notes.firstVersion = `The first version could not be saved: ${firstVersion.error}. Edits stay blocked until it is saved.`;
  if (legacy) notes.oldCanvas = legacyCanvasNote(legacy);
  return { ready, etaSeconds: firstVersion?.pending ? firstVersion.etaSeconds : 0, ...notes };
}
