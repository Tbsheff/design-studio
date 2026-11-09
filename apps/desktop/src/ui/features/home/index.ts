import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { ProjectRail as ProjectRailView } from "./project-rail.js";

const Home = lazy(async () => {
  const loaded = await import("./home.js");

  return { default: loaded.Home };
});

const ProjectRail: LazyExoticComponent<typeof ProjectRailView> = lazy(
  async () => {
    const loaded = await import("./project-rail.js");

    return { default: loaded.ProjectRail };
  }
);

export {
  toFilteredProjects,
  isThumbnailPending,
  toSortedProjects,
  toGridColumns,
  toNextGridIndex,
} from "./project-list-model.js";

export { setRailToggled, useRail } from "./rail-store-model.js";

export { Home, ProjectRail };
