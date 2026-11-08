import type { Project } from "@design-studio/contracts";
import { useCallback } from "react";

import { warmProject } from "../../api.js";
import { prefetchStudio } from "../../app/screen-preload.js";
import { uiStore } from "../../platform/storage.js";

interface CardWarm {
  readonly warmOpen: () => void;
  readonly warmOpenWithPreview: () => void;
}

const startWarmOpen = (project: Project, hasPreview: boolean): void => {
  void prefetchStudio();

  const directionId =
    uiStore.get().directionByProject[project.id] ??
    project.directions[0]?.id ??
    null;

  if (hasPreview) {
    warmProject(project.id, directionId);
  } else {
    warmProject(project.id, null);
  }
};

const useCardWarm = (project: Project): CardWarm => {
  const warmOpen = useCallback((): void => {
    startWarmOpen(project, false);
  }, [project]);

  const warmOpenWithPreview = useCallback((): void => {
    startWarmOpen(project, true);
  }, [project]);

  return { warmOpen, warmOpenWithPreview };
};

export { useCardWarm };
