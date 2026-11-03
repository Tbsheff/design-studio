import { useEffect, useState } from "react";

import type {
  AppLogLine,
  AppServerStatus,
  AttachedApp,
  FirstVersionState,
} from "../../../shared/contracts";
import { api } from "../../api";
import { publishAppStatus } from "../../appStatus";

const POLL_OPEN_MS = 1500;
const POLL_CLOSED_MS = 5000;

function useAppState(
  projectId: string,
  open: boolean,
  initial: AppServerStatus | null = null
) {
  const [status, setStatus] = useState<AppServerStatus | null>(initial);
  const [current, setCurrent] = useState<AttachedApp | null>(null);
  const [logs, setLogs] = useState<AppLogLine[]>([]);

  const [firstVersion, setFirstVersion] = useState<FirstVersionState | null>(
    null
  );

  const [tick, setTick] = useState(0);
  const settled = status?.state === "ready" && !firstVersion?.pending;
  useEffect(() => {
    let alive = true;

    const load = () =>
      api
        .appState(projectId)
        .then((state) => {
          if (!alive) {
            return;
          }

          setStatus(state.status);
          setCurrent(state.app);
          setLogs(state.logs);
          setFirstVersion(state.firstVersion ?? null);
          publishAppStatus(projectId, state.status);
        })
        .catch(() => undefined);

    void load();

    const timer = window.setInterval(
      load,
      open || !settled ? POLL_OPEN_MS : POLL_CLOSED_MS
    );

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [projectId, open, tick, settled]);

  return {
    status,
    app: current,
    logs,
    firstVersion,
    refresh: () => setTick((n) => n + 1),
  };
}

export { POLL_OPEN_MS, POLL_CLOSED_MS, useAppState };
