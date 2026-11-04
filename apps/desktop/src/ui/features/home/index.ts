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

export { Home };
