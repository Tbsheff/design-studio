import { devStatusRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const limit = 200;

const cursor = null;

const status = null;

const useListDevStatus = (
  projectId: string
): ActionState<typeof devStatusRoutes.listDevStatus> =>
  useAction(devStatusRoutes.listDevStatus, {
    cursor,
    limit,
    projectId,
    status,
  });

export { useListDevStatus };
