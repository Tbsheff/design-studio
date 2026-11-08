import path from "node:path";

import type { Project } from "@design-studio/contracts";

const MAIN_DIRECTION = "main";

const toAppRoot = (project: Project): string | null => {
  const app = project.app ?? null;

  if (app === null) {
    return null;
  }

  const main =
    project.directions.find((direction) => direction.id === MAIN_DIRECTION) ??
    project.directions[0] ??
    null;

  if (main === null) {
    return null;
  }

  return path.join(main.workTree, app.appDir);
};

export { toAppRoot };
