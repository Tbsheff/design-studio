import type { Project } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import type { LastRun } from "./library-model.js";
import { listRecentRuns } from "./use-last-runs.js";

type RecentRuns = Awaited<ReturnType<typeof listRecentRuns>>;

const RECENT_COUNT = 5;

const getRecentRuns = async (projectId: string): Promise<RecentRuns> => {
  try {
    return await listRecentRuns(projectId, RECENT_COUNT);
  } catch {
    return [];
  }
};

const useLastRun = (project: Project): LastRun | null => {
  const [last, setLast] = useState<LastRun | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const load = async (): Promise<void> => {
      const items = await getRecentRuns(project.id);

      const [run] = items.toSorted(
        (first, second) => second.startedAt - first.startedAt
      );

      if (!isCancelled && run) {
        setLast({
          at: run.startedAt,
          prompt: run.request.prompt,
          route: run.request.canvas?.path ?? null,
        });
      }
    };

    void load();

    return (): void => {
      isCancelled = true;
    };
  }, [project.id]);

  return last;
};

export { useLastRun };
