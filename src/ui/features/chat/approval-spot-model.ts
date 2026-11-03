import { useEffect, useSyncExternalStore } from "react";

let inlineProject: string | null = null;
const listeners = new Set<() => void>();

const setInline = (projectId: string | null): void => {
  if (inlineProject === projectId) {
    return;
  }

  inlineProject = projectId;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);

  return () => {
    listeners.delete(l);
  };
};

export const useInlineApprovals = (
  projectId: string,
  paneCollapsed: boolean,
  tab: string
): void => {
  const shown = !paneCollapsed && tab === "chat";
  useEffect(() => {
    setInline(shown ? projectId : null);

    return () => setInline(null);
  }, [projectId, shown]);
};

export const useInlineApprovalProject = (): string | null =>
  useSyncExternalStore(subscribe, () => inlineProject);
