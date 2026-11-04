import type { WireOutput } from "@design-studio/actions/_core/action";
import type { listRun } from "@design-studio/actions/run/list";
import { routes as runsRoutes } from "@design-studio/actions/run/routes";

import { call } from "./deps.js";

type RecentRuns = WireOutput<typeof listRun>["items"];

const listRecentRuns = async (
  projectId: string,
  limit: number
): Promise<RecentRuns> => {
  const page = await call(runsRoutes.listRun, {
    cursor: null,
    light: true,
    limit,
    projectId,
  });

  return page.items;
};

export { listRecentRuns };
