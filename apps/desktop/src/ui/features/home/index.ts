import { lazy } from "react";

const Home = lazy(async () => {
  const loaded = await import("./home.js");

  return { default: loaded.Home };
});

export {
  toFilteredProjects,
  isThumbnailPending,
  toSortedProjects,
  toGridColumns,
  toNextGridIndex,
} from "./project-list-model.js";

export { setRailToggled, useRail } from "./rail-store-model.js";

export { Home };
