const WATCH_DELAY_MS = 300;
const SETTLE_MAX_MS = 60000;
const PAGES_MAX = 6;

const pending = new Map<string, Promise<void>>();
const pages = new Map<string, string[]>();

export function noteRenderedPage(projectId: string, page: string | undefined): void {
  const list = (pages.get(projectId) ?? []).filter((item) => item !== (page ?? ''));
  list.unshift(page ?? '');
  pages.set(projectId, list.slice(0, PAGES_MAX));
}

export function recentPages(projectId: string): string[] {
  return pages.get(projectId) ?? [];
}

export function startRender(projectId: string, render: () => Promise<void>): void {
  const before = pending.get(projectId);
  const job: Promise<void> = (async () => {
    await before;
    await new Promise((done) => setTimeout(done, WATCH_DELAY_MS));
    await render();
  })()
    .catch((error: unknown) => console.error('[render-wait] warm failed', error))
    .finally(() => {
      if (pending.get(projectId) === job) pending.delete(projectId);
    });
  pending.set(projectId, job);
}

export function renderPending(projectId?: string): boolean {
  return projectId ? pending.has(projectId) : pending.size > 0;
}

export async function renderSettled(projectId?: string): Promise<boolean> {
  const jobs = projectId ? [pending.get(projectId)].filter((job): job is Promise<void> => job !== undefined) : [...pending.values()];
  if (jobs.length === 0) return true;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((done) => {
    timer = setTimeout(() => done(false), SETTLE_MAX_MS);
    timer.unref();
  });
  const settled = await Promise.race([Promise.all(jobs).then(() => true as const), timeout]);
  clearTimeout(timer);
  return settled;
}
