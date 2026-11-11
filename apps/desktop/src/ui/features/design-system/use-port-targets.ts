import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

interface TargetsState {
  apps: Project[] | null;
  linkedApp: string | null;
  source: Project | null;
  error: string | null;
}

interface Targets extends TargetsState {
  reload: () => void;
}

const NO_APP = "";

const toLinkedApp = (
  list: readonly Project[],
  source: Project | null
): string | null => {
  const linked = list.find((project) => project.id === source?.appProjectId);

  if (!linked) {
    return null;
  }

  if (linked.app) {
    return linked.id;
  }

  const folder = linked.folder?.path ?? null;

  const app = list.find(
    (project) => project.app && project.imported?.sourcePath === folder
  );

  return app?.id ?? NO_APP;
};

const loadTargets = async (
  sourceId: string,
  isAlive: () => boolean,
  apply: (next: TargetsState) => void
): Promise<void> => {
  try {
    const list = await api.listProjects();

    if (isAlive()) {
      const source = list.find((project) => project.id === sourceId) ?? null;

      apply({
        apps: list.filter((project) => project.app && project.id !== sourceId),
        error: null,
        linkedApp: toLinkedApp(list, source),
        source,
      });
    }
  } catch (error: unknown) {
    if (isAlive()) {
      apply({
        apps: [],
        error: errorText(error),
        linkedApp: null,
        source: null,
      });
    }
  }
};

const isAlways = (): boolean => true;

const useTargets = (sourceId: string): Targets => {
  const [state, setState] = useState<TargetsState>({
    apps: null,
    error: null,
    linkedApp: null,
    source: null,
  });

  const reload = useCallback((): void => {
    loadTargets(sourceId, isAlways, setState);
  }, [sourceId]);

  useEffect(() => {
    let alive = true;
    loadTargets(sourceId, () => alive, setState);

    return (): void => {
      alive = false;
    };
  }, [sourceId]);

  return { ...state, reload };
};

export { useTargets };

export type { Targets };
