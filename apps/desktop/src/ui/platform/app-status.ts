import type { AppServerStatus } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

const APP_PANEL_EVENT = "studio:app-panel";

function openAppPanel(tab: "routes" | "logs" | "settings"): void {
  globalThis.dispatchEvent(new CustomEvent(APP_PANEL_EVENT, { detail: tab }));
}

const statuses = new Map<string, AppServerStatus | null>();
const listeners = new Set<() => void>();

function publishAppStatus(
  projectId: string,
  status: AppServerStatus | null
): void {
  statuses.set(projectId, status);

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function useAppStatus(projectId: string): AppServerStatus | null {
  return useSyncExternalStore(subscribe, () => statuses.get(projectId) ?? null);
}

export { APP_PANEL_EVENT, openAppPanel, publishAppStatus, useAppStatus };
