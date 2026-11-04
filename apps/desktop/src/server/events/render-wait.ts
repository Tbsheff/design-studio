import { setTimeout as sleep } from "node:timers/promises";

import { logError } from "../platform/logger/index.js";

const WATCH_DELAY_MS = 300;
const SETTLE_MAX_MS = 60_000;
const PAGES_MAX = 6;

interface RenderJob {
  started: boolean;
  controller: AbortController;
  done: Promise<void>;
}

type Render = (signal: AbortSignal) => Promise<void>;

const pending = new Map<string, Promise<void>>();
const jobs = new Map<string, RenderJob>();
const lastDone = new Map<string, number>();
const pages = new Map<string, string[]>();

const noteRenderedPage = (projectId: string, page?: string): void => {
  const list = (pages.get(projectId) ?? []).filter(
    (item) => item !== (page ?? "")
  );

  list.unshift(page ?? "");
  pages.set(projectId, list.slice(0, PAGES_MAX));
};

const recentPages = (projectId: string): string[] => pages.get(projectId) ?? [];

const runJob = async (
  projectId: string,
  job: RenderJob,
  before: RenderJob | null,
  render: Render
): Promise<void> => {
  try {
    await before?.done;
    await sleep(WATCH_DELAY_MS);
    job.started = true;
    await render(job.controller.signal);
  } catch (error) {
    if (!job.controller.signal.aborted) {
      logError("[render-wait] warm failed", error);
    }
  } finally {
    lastDone.set(projectId, Date.now());

    if (jobs.get(projectId) === job) {
      jobs.delete(projectId);
      pending.delete(projectId);
    }
  }
};

const startRender = (projectId: string, render: Render): void => {
  const before = jobs.get(projectId) ?? null;

  if (before && !before.started) {
    return;
  }

  before?.controller.abort();

  const job: RenderJob = {
    controller: new AbortController(),
    done: Promise.resolve(),
    started: false,
  };

  job.done = runJob(projectId, job, before, render);
  jobs.set(projectId, job);
  pending.set(projectId, job.done);
};

const renderPending = (projectId?: string): boolean => {
  if (projectId) {
    return pending.has(projectId);
  }

  return pending.size > 0;
};

const renderedSince = (projectId: string, since: number): boolean =>
  (lastDone.get(projectId) ?? 0) >= since;

const currentJobs = (projectId?: string): Promise<void>[] => {
  if (!projectId) {
    return [...pending.values()];
  }

  const job = pending.get(projectId);

  if (job) {
    return [job];
  }

  return [];
};

const latestJobs = async (projectId?: string): Promise<void> => {
  const current = currentJobs(projectId);

  if (current.length === 0) {
    return;
  }

  await Promise.all(current);
  await latestJobs(projectId);
};

const allSettled = async (projectId?: string): Promise<true> => {
  await latestJobs(projectId);

  return true;
};

const PREVIEW_HOST = /^p-(?<hex>(?:[0-9a-f]{2})+)\.localhost$/u;

const hexOfUrl = (url: string): string | null => {
  try {
    return PREVIEW_HOST.exec(new URL(url).hostname)?.groups?.hex ?? null;
  } catch {
    return null;
  }
};

const projectOfUrl = (url: string): string | null => {
  const hex = hexOfUrl(url);

  if (hex) {
    return Buffer.from(hex, "hex").toString("utf-8");
  }

  return null;
};

const settleWithin = async (projectId?: string): Promise<boolean> => {
  const controller = new AbortController();

  const timeout = sleep(SETTLE_MAX_MS, false, {
    ref: false,
    signal: controller.signal,
  });

  const settled = await Promise.race([allSettled(projectId), timeout]);

  controller.abort();

  return settled;
};

const renderSettled = async (projectId?: string): Promise<boolean> => {
  if (!renderPending(projectId)) {
    return true;
  }

  return await settleWithin(projectId);
};

const renderSettledFor = (url: string): Promise<boolean> =>
  renderSettled(projectOfUrl(url) ?? "");

export {
  noteRenderedPage,
  projectOfUrl,
  recentPages,
  renderPending,
  renderSettled,
  renderSettledFor,
  renderedSince,
  startRender,
};
