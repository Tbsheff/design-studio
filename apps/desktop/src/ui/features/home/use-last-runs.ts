import type { WireOutput } from "@design-studio/actions/_core/action";
import type { listRun } from "@design-studio/actions/run/list";
import { routes as runsRoutes } from "@design-studio/actions/run/routes";

import { call, readShared } from "./deps.js";

type RecentRuns = WireOutput<typeof listRun>["items"];

const listRecentRuns = async (
  projectId: string,
  limit: number
): Promise<RecentRuns> => {
  const input = { cursor: null, light: true, limit, projectId };

  const page = await readShared(
    JSON.stringify([runsRoutes.listRun.id, input]),
    () => call(runsRoutes.listRun, input)
  );

  return page.items;
};

export { listRecentRuns };
