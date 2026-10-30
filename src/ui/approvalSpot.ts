import { useEffect, useSyncExternalStore } from 'react';

let inlineProject: string | null = null;
const listeners = new Set<() => void>();

function setInline(projectId: string | null): void {
  if (inlineProject === projectId) return;
  inlineProject = projectId;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useInlineApprovals(projectId: string, paneCollapsed: boolean, tab: string): void {
  const shown = !paneCollapsed && tab === 'chat';
  useEffect(() => {
    setInline(shown ? projectId : null);
    return () => setInline(null);
  }, [projectId, shown]);
}

export function useInlineApprovalProject(): string | null {
  return useSyncExternalStore(subscribe, () => inlineProject);
}
