import { useEffect, useSyncExternalStore } from "react";

let inlineProject: string | null = null;
const listeners = new Set<() => void>();

const setInline = (projectId: string | null): void => {
  if (inlineProject === projectId) {
    return;
  }

  inlineProject = projectId;

  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const useInlineApprovals = (
  projectId: string,
  paneCollapsed: boolean,
  tab: string
): void => {
  const shown = !paneCollapsed && tab === "chat";
  useEffect(() => {
    if (shown) {
      setInline(projectId);
    } else {
      setInline(null);
    }

    return (): void => setInline(null);
  }, [projectId, shown]);
};

const useInlineApprovalProject = (): string | null =>
  useSyncExternalStore(subscribe, () => inlineProject);

export { useInlineApprovalProject, useInlineApprovals };
