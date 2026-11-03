import type { FoundApps } from "../../shared/found-apps.js";
import { findApps } from "../app/found-apps.js";
import type { StudioProjectStore } from "../store/projects.js";

const readFoundApps = async (
  projects: StudioProjectStore,
  isFresh: boolean
): Promise<FoundApps> => findApps(await projects.list(), { fresh: isFresh });

export { readFoundApps };
