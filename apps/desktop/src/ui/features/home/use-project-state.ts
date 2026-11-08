import type { Project } from "@design-studio/contracts";
import { useEffect } from "react";

import { api, errorText } from "../../api.js";
import { useKeyedState } from "./use-keyed-state.js";

interface ProjectState {
  readonly project: Project | null;
  readonly loadError: string | null;
  readonly setProject: (project: Project) => void;
  readonly updateProject: (
    change: (previous: Project | null) => Project | null
  ) => void;
}

const useProjectState = (projectId: string): ProjectState => {
  const projectBox = useKeyedState<Project | null>(projectId, null);
  const errorBox = useKeyedState<string | null>(projectId, null);
  const { set: setProject, update: updateProject } = projectBox;
  const { set: setLoadError } = errorBox;

  useEffect(() => {
    let isLive = true;

    const load = async (): Promise<void> => {
      try {
        const loaded = await api.getProject(projectId);

        if (isLive) {
          setProject(loaded);
        }
      } catch (error) {
        if (isLive) {
          setLoadError(errorText(error));
        }
      }
    };

    load();

    return (): void => {
      isLive = false;
    };
  }, [projectId, setProject, setLoadError]);

  return {
    loadError: errorBox.value,
    project: projectBox.value,
    setProject,
    updateProject,
  };
};

export { useProjectState };
