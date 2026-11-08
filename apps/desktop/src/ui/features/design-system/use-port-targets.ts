import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

interface TargetsState {
  apps: Project[] | null;
  source: Project | null;
  error: string | null;
}

interface Targets extends TargetsState {
  reload: () => void;
}

const loadTargets = async (
  sourceId: string,
  isAlive: () => boolean,
  apply: (next: TargetsState) => void
): Promise<void> => {
  try {
    const list = await api.listProjects();

    if (isAlive()) {
      apply({
        apps: list.filter((project) => project.app && project.id !== sourceId),
        error: null,
        source: list.find((project) => project.id === sourceId) ?? null,
      });
    }
  } catch (error: unknown) {
    if (isAlive()) {
      apply({ apps: [], error: errorText(error), source: null });
    }
  }
};

const isAlways = (): boolean => true;

const useTargets = (sourceId: string): Targets => {
  const [state, setState] = useState<TargetsState>({
    apps: null,
    error: null,
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
