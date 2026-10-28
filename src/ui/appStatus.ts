import { useSyncExternalStore } from 'react';
import type { AppServerStatus } from '../shared/contracts';

export const APP_PANEL_EVENT = 'studio:app-panel';

export function openAppPanel(tab: 'routes' | 'logs' | 'settings'): void {
  window.dispatchEvent(new CustomEvent(APP_PANEL_EVENT, { detail: tab }));
}

const statuses = new Map<string, AppServerStatus | null>();
const listeners = new Set<() => void>();

export function publishAppStatus(projectId: string, status: AppServerStatus | null): void {
  statuses.set(projectId, status);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppStatus(projectId: string): AppServerStatus | null {
  return useSyncExternalStore(subscribe, () => statuses.get(projectId) ?? null);
}
