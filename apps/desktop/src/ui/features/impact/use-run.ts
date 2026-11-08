import { impactRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useRunImpact = (): ActionState<typeof impactRoutes.runImpact> =>
  useAction(impactRoutes.runImpact);

export { useRunImpact };
