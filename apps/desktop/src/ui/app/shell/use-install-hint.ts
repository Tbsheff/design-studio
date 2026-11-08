import type { AttachedApp } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";

import type { FolderInspection } from "../../../shared/open-app";
import { api } from "../../api";

interface InstallHint {
  readonly hint: FolderInspection | null;
  readonly reload: () => void;
}

const loadHint = async (
  projectId: string,
  appDir: AttachedApp["appDir"]
): Promise<FolderInspection | null> => {
  try {
    const project = await api.getProject(projectId);

    if (project.imported) {
      return await api.inspectFolder(project.imported.sourcePath, appDir);
    }

    return null;
  } catch {
    return null;
  }
};

const fetchHint = async (
  projectId: string,
  appDir: AttachedApp["appDir"],
  isCurrent: () => boolean,
  onHint: (hint: FolderInspection | null) => void
): Promise<void> => {
  const result = await loadHint(projectId, appDir);

  if (isCurrent()) {
    onHint(result);
  }
};

const useInstallHint = (
  projectId: string,
  app: AttachedApp,
  isManaged: boolean
): InstallHint => {
  const [hint, setHint] = useState<FolderInspection | null>(null);
  const { appDir } = app;

  useEffect(() => {
    let live = true;

    if (isManaged) {
      void fetchHint(projectId, appDir, () => live, setHint);
    }

    return (): void => {
      live = false;
    };
  }, [appDir, isManaged, projectId]);

  const reload = useCallback((): void => {
    if (isManaged) {
      void fetchHint(projectId, appDir, () => true, setHint);
    }
  }, [appDir, isManaged, projectId]);

  return { hint, reload };
};

export { useInstallHint };
