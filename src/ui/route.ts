import { uiStore } from './storage';

const PROJECT_PATH = /^\/p\/([^/]+)\/?$/;

export function projectFromPath(pathname: string): string | null {
  const match = PROJECT_PATH.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function pathForProject(projectId: string | null): string {
  return projectId ? `/p/${encodeURIComponent(projectId)}` : '/';
}

let installed = false;

export function installRouting(): void {
  if (installed) return;
  installed = true;
  let current = projectFromPath(window.location.pathname);
  const canonical = pathForProject(current);
  if (window.location.pathname !== canonical) window.history.replaceState(null, '', `${canonical}${window.location.search}${window.location.hash}`);
  if (uiStore.get().activeProjectId !== current) uiStore.set({ activeProjectId: current });
  uiStore.subscribe(() => {
    const next = uiStore.get().activeProjectId;
    if (next === current) return;
    current = next;
    window.history.pushState(null, '', pathForProject(next));
  });
  window.addEventListener('popstate', () => {
    const next = projectFromPath(window.location.pathname);
    current = next;
    if (uiStore.get().activeProjectId !== next) uiStore.set({ activeProjectId: next });
  });
}
