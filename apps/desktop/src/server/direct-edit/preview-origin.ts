import type { Direction, Project } from "@design-studio/contracts";

import type { PreviewService } from "../../shared/server-ports.js";

const toPreviewOrigin = async (
  preview: PreviewService,
  project: Project,
  direction: Direction
): Promise<string | null> => {
  if (project.kind !== "react") {
    return null;
  }

  try {
    return new URL(await preview.directionUrl(project, direction)).origin;
  } catch {
    return null;
  }
};

export { toPreviewOrigin };
