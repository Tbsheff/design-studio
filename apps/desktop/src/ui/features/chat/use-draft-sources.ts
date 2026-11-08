import type { DraftSourcesState, RunStatus } from "@design-studio/contracts";
import { useEffect, useState, startTransition } from "react";

import { api } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { packApi } from "../../platform/pack-api.js";

interface ImproveEnd {
  readonly runId: string;
  readonly status: RunStatus;
}

interface StoredSources {
  readonly key: string;
  readonly value: DraftSourcesState;
}

interface DraftSourcesView {
  readonly improveEnd: RunStatus | null;
  readonly state: DraftSourcesState | null;
}

const ignoreFailure = (): null => null;

const toEventProject = (enabled: boolean, projectId: string): string | null => {
  if (enabled) {
    return projectId;
  }

  return null;
};

const toEndStatus = (
  end: ImproveEnd | null,
  runId: string | null
): RunStatus | null => {
  if (end && end.runId === runId) {
    return end.status;
  }

  return null;
};

const toStoredState = (
  stored: StoredSources | null,
  key: string
): DraftSourcesState | null => {
  if (stored?.key === key) {
    return stored.value;
  }

  return null;
};

const useImproveEnd = (
  projectId: string,
  runId: string | null,
  setEnd: (end: ImproveEnd) => void
): void => {
  useEffect(() => {
    if (!runId) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const run = await api.getRun(projectId, runId);

        if (live && run.summary.status !== "running") {
          setEnd({ runId, status: run.summary.status });
        }
      } catch {
        ignoreFailure();
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, runId, setEnd]);
};

const useSourcesFetch = (
  projectId: string,
  enabled: boolean,
  key: string,
  setStored: (
    update: (prev: StoredSources | null) => StoredSources | null
  ) => void
): void => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const info = await packApi.getDesignSystemDraft(projectId);
        const { sources } = info;

        if (live && sources) {
          setStored((prev) => {
            if (prev?.key === key) {
              return prev;
            }

            return { key, value: sources };
          });
        }
      } catch {
        ignoreFailure();
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, enabled, key, setStored]);
};

const useDraftSources = (
  projectId: string,
  enabled: boolean
): DraftSourcesView => {
  const key = `${projectId}:${enabled}`;
  const [stored, setStored] = useState<StoredSources | null>(null);
  const [end, setEnd] = useState<ImproveEnd | null>(null);
  const state = toStoredState(stored, key);

  let runId: string | null = null;

  if (state?.improve.state === "started") {
    runId = state.improve.runId ?? null;
  }

  useImproveEnd(projectId, runId, setEnd);
  useSourcesFetch(projectId, enabled, key, setStored);
  useProjectEvents(toEventProject(enabled, projectId), (event) => {
    if (event.type === "design-system.sources") {
      setStored({ key, value: event.sources });
    }

    if (event.type === "run.finished" && event.runId === runId) {
      setEnd({ runId, status: event.summary.status });
    }
  });

  return { improveEnd: toEndStatus(end, runId), state };
};

export { useDraftSources };
