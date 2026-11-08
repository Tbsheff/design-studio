import type { AppServerStatus } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

const APP_PANEL_EVENT = "studio:app-panel";

const openAppPanel = (tab: "routes" | "logs" | "settings"): void => {
  globalThis.dispatchEvent(new CustomEvent(APP_PANEL_EVENT, { detail: tab }));
};

const statuses = new Map<string, AppServerStatus | null>();
const listeners = new Set<() => void>();

const publishAppStatus = (
  projectId: string,
  status: AppServerStatus | null
): void => {
  statuses.set(projectId, status);

  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const useAppStatus = (projectId: string): AppServerStatus | null =>
  useSyncExternalStore(subscribe, () => statuses.get(projectId) ?? null);

export { APP_PANEL_EVENT, openAppPanel, publishAppStatus, useAppStatus };
