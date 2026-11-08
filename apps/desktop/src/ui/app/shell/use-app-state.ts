import type {
  AppLogLine,
  AppServerStatus,
  AttachedApp,
  FirstVersionState,
  StudioEvent,
} from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../api";
import { publishAppStatus } from "../../platform/app-status";
import { useProjectEvents } from "../../platform/events";
import { useLatest } from "../../platform/use-latest.js";

type AppState = Awaited<ReturnType<typeof api.appState>>;

const readAppState = async (projectId: string): Promise<AppState | null> => {
  try {
    return await api.appState(projectId);
  } catch {
    return null;
  }
};

const fetchInto = async (
  projectId: string,
  isCurrent: () => boolean,
  apply: (state: AppState) => void
): Promise<void> => {
  const state = await readAppState(projectId);

  if (state !== null && isCurrent()) {
    apply(state);
  }
};

interface AppStateView {
  readonly app: AttachedApp | null;
  readonly firstVersion: FirstVersionState | null;
  readonly logs: AppLogLine[];
  readonly refresh: () => void;
  readonly status: AppServerStatus | null;
}

const useAppState = (
  projectId: string,
  initial: AppServerStatus | null = null
): AppStateView => {
  const [status, setStatus] = useState<AppServerStatus | null>(initial);
  const [current, setCurrent] = useState<AttachedApp | null>(null);
  const [logs, setLogs] = useState<AppLogLine[]>([]);

  const [firstVersion, setFirstVersion] = useState<FirstVersionState | null>(
    null
  );

  const activeProject = useLatest(projectId);

  const apply = useCallback(
    (state: AppState): void => {
      setStatus(state.status);
      setCurrent(state.app);
      setLogs(state.logs);
      setFirstVersion(state.firstVersion ?? null);
      publishAppStatus(projectId, state.status);
    },
    [projectId]
  );

  const refresh = useCallback((): void => {
    void fetchInto(projectId, () => activeProject.current === projectId, apply);
  }, [activeProject, apply, projectId]);

  const onEvent = useCallback(
    (event: StudioEvent) => {
      if (event.type === "app.status") {
        refresh();
      }
    },
    [refresh]
  );

  useProjectEvents(projectId, onEvent);

  useEffect(() => {
    let isAlive = true;

    void fetchInto(projectId, () => isAlive, apply);

    return (): void => {
      isAlive = false;
    };
  }, [apply, projectId]);

  return { app: current, firstVersion, logs, refresh, status };
};

export { useAppState };
