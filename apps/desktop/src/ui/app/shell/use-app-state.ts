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

type AppState = Awaited<ReturnType<typeof api.appState>>;

const readAppState = async (projectId: string): Promise<AppState | null> => {
  try {
    return await api.appState(projectId);
  } catch {
    return null;
  }
};

const useAppState = (
  projectId: string,
  open: boolean,
  initial: AppServerStatus | null = null
) => {
  const [status, setStatus] = useState<AppServerStatus | null>(initial);
  const [current, setCurrent] = useState<AttachedApp | null>(null);
  const [logs, setLogs] = useState<AppLogLine[]>([]);

  const [firstVersion, setFirstVersion] = useState<FirstVersionState | null>(
    null
  );

  const [tick, setTick] = useState(0);

  const onEvent = useCallback((event: StudioEvent) => {
    if (event.type === "app.status") {
      setTick((count) => count + 1);
    }
  }, []);

  useProjectEvents(projectId, onEvent);

  useEffect(() => {
    let isAlive = true;

    const load = async (): Promise<void> => {
      const state = await readAppState(projectId);

      if (!isAlive || state === null) {
        return;
      }

      setStatus(state.status);
      setCurrent(state.app);
      setLogs(state.logs);
      setFirstVersion(state.firstVersion ?? null);
      publishAppStatus(projectId, state.status);
    };

    void load();

    return (): void => {
      isAlive = false;
    };
  }, [projectId, open, tick]);

  const refresh = useCallback(() => setTick((count) => count + 1), []);

  return { app: current, firstVersion, logs, refresh, status };
};

export { useAppState };
