const WATCH_DELAY_MS = 300;
const SETTLE_MAX_MS = 60000;
const PAGES_MAX = 6;

interface RenderJob {
  started: boolean;
  controller: AbortController;
  done: Promise<void>;
}

const pending = new Map<string, Promise<void>>();
const jobs = new Map<string, RenderJob>();
const lastDone = new Map<string, number>();
const pages = new Map<string, string[]>();

export function noteRenderedPage(projectId: string, page: string | undefined): void {
  const list = (pages.get(projectId) ?? []).filter((item) => item !== (page ?? ''));
  list.unshift(page ?? '');
  pages.set(projectId, list.slice(0, PAGES_MAX));
}

export function recentPages(projectId: string): string[] {
  return pages.get(projectId) ?? [];
}

export function startRender(projectId: string, render: (signal: AbortSignal) => Promise<void>): void {
  const before = jobs.get(projectId);
  if (before && !before.started) return;
  before?.controller.abort();
  const job: RenderJob = { started: false, controller: new AbortController(), done: Promise.resolve() };
  job.done = (async () => {
    await before?.done;
    await new Promise((done) => setTimeout(done, WATCH_DELAY_MS));
    job.started = true;
    await render(job.controller.signal);
  })()
    .catch((error: unknown) => {
      if (!job.controller.signal.aborted) console.error('[render-wait] warm failed', error);
    })
    .finally(() => {
      lastDone.set(projectId, Date.now());
      if (jobs.get(projectId) === job) {
        jobs.delete(projectId);
        pending.delete(projectId);
      }
    });
  jobs.set(projectId, job);
  pending.set(projectId, job.done);
}

export function renderPending(projectId?: string): boolean {
  return projectId ? pending.has(projectId) : pending.size > 0;
}

export function renderedSince(projectId: string, since: number): boolean {
  return (lastDone.get(projectId) ?? 0) >= since;
}

async function latestJobs(projectId?: string): Promise<void> {
  for (;;) {
    const current = projectId ? [pending.get(projectId)].filter((job): job is Promise<void> => job !== undefined) : [...pending.values()];
    if (current.length === 0) return;
    await Promise.all(current);
  }
}

const PREVIEW_HOST = /^p-((?:[0-9a-f]{2})+)\.localhost$/;

export function projectOfUrl(url: string): string | undefined {
  try {
    const hex = PREVIEW_HOST.exec(new URL(url).hostname)?.[1];
    return hex ? Buffer.from(hex, 'hex').toString('utf8') : undefined;
  } catch {
    return undefined;
  }
}

export function renderSettledFor(url: string): Promise<boolean> {
  return renderSettled(projectOfUrl(url));
}

export async function renderSettled(projectId?: string): Promise<boolean> {
  if (projectId ? !pending.has(projectId) : pending.size === 0) return true;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((done) => {
    timer = setTimeout(() => done(false), SETTLE_MAX_MS);
    timer.unref();
  });
  const settled = await Promise.race([latestJobs(projectId).then(() => true as const), timeout]);
  clearTimeout(timer);
  return settled;
}
