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

export type { CommandSource as HomeCommandSource } from "./use-home-ide.js";

export type { HomeCommand, HomeLayer } from "./home-command-model.js";

export { Home };
