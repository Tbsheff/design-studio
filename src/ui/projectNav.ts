import { prefetchStudio } from './screens';
import { uiStore } from './storage';

export const OPEN_ROUTE_EVENT = 'studio:open-route';

type Switcher = (projectId: string | null) => void;

let switcher: Switcher | null = null;
let pending: { projectId: string; route: string } | null = null;

export function setProjectSwitcher(next: Switcher): () => void {
  switcher = next;
  return () => {
    if (switcher === next) switcher = null;
  };
}

export function takePendingRoute(projectId: string): string | null {
  if (pending?.projectId !== projectId) return null;
  const { route } = pending;
  pending = null;
  return route;
}

export function openProject(projectId: string, route?: string): void {
  if (uiStore.get().activeProjectId === projectId) {
    pending = null;
    if (route) window.dispatchEvent(new CustomEvent(OPEN_ROUTE_EVENT, { detail: { projectId, route } }));
    return;
  }
  pending = route ? { projectId, route } : null;
  if (switcher) {
    switcher(projectId);
    return;
  }
  void prefetchStudio().then(() => uiStore.set({ activeProjectId: projectId, screen: 'home' }));
}

export function goHome(): void {
  if (switcher && uiStore.get().activeProjectId) switcher(null);
  else uiStore.set({ activeProjectId: null, screen: 'home' });
}
