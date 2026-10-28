import type { Direction, Project } from '../../shared/contracts.js';

interface Job {
  run: Promise<void> | null;
  start(): Promise<void>;
}

export interface WarmQueue {
  add(project: Project, direction: Direction, after: Promise<unknown>): void;
  settled(project: Project, direction: Direction): Promise<void>;
}

export function createWarmQueue(keyOf: (project: Project, direction: Direction) => string, scan: (project: Project, direction: Direction) => Promise<void>): WarmQueue {
  const jobs = new Map<string, Job>();
  let chain: Promise<void> = Promise.resolve();

  return {
    add(project, direction, after) {
      const key = keyOf(project, direction);
      if (jobs.has(key)) return;
      const job: Job = {
        run: null,
        start() {
          job.run ??= after
            .then(() => scan(project, direction), () => undefined)
            .catch((error: unknown) => console.error('[versions] background status check failed', error instanceof Error ? error.message : error))
            .finally(() => {
              if (jobs.get(key) === job) jobs.delete(key);
            });
          return job.run;
        },
      };
      jobs.set(key, job);
      chain = chain.then(() => job.start());
    },

    async settled(project, direction) {
      await jobs.get(keyOf(project, direction))?.start();
    },
  };
}
