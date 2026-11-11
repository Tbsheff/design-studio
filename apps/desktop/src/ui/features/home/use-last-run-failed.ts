import type { Project } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import type { KeyedFlag } from "./home-model.js";
import { listRecentRuns } from "./use-last-runs.js";

const runCache = new Map<string, Promise<boolean>>();

const RECENT_COUNT = 5;

const isLastRunFailed = async (
  key: string,
  projectId: string
): Promise<boolean> => {
  try {
    const items = await listRecentRuns(projectId, RECENT_COUNT);

    const [run] = items.toSorted(
      (first, second) => second.startedAt - first.startedAt
    );

    return run?.status === "failed";
  } catch (error) {
    runCache.delete(key);
    throw error;
  }
};

const hasCachedRunFailed = (
  key: string,
  projectId: string
): Promise<boolean> => {
  const cached = runCache.get(key);

  if (cached) {
    return cached;
  }

  const pending = isLastRunFailed(key, projectId);
  runCache.set(key, pending);

  return pending;
};

interface LastRunFailure {
  readonly hasFailed: boolean;
}

const useLastRunFailure = (project: Project): LastRunFailure => {
  const key = `${project.id}/${project.updatedAt}`;
  const [failed, setFailed] = useState<KeyedFlag | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const load = async (): Promise<void> => {
      try {
        const isOn = await hasCachedRunFailed(key, project.id);

        if (!isCancelled) {
          setFailed({ isOn, key });
        }
      } catch {
        runCache.delete(key);
      }
    };

    void load();

    return (): void => {
      isCancelled = true;
    };
  }, [key, project.id]);

  return { hasFailed: failed?.key === key && failed.isOn };
};

export { useLastRunFailure };
