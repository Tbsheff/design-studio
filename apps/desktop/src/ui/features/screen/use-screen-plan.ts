import { screenRoutes, useAction } from "./deps.js";
import type { ActionState, RouteInput } from "./deps.js";
import { hasPath, toTrimmedPath } from "./screen-model.js";

type PlanInput = RouteInput<typeof screenRoutes.inspectScreen>;

const PLAN_LIMIT = 50;

const toPlanInput = (projectId: string, path: string): PlanInput | null => {
  if (!hasPath(path)) {
    return null;
  }

  return {
    cursor: null,
    limit: PLAN_LIMIT,
    path: toTrimmedPath(path),
    projectId,
  };
};

const useScreenPlan = (
  projectId: string,
  path: string
): ActionState<typeof screenRoutes.inspectScreen> =>
  useAction(screenRoutes.inspectScreen, toPlanInput(projectId, path));

export { useScreenPlan };
