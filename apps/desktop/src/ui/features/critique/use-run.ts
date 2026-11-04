import { critiqueRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useRunCritique = (): ActionState<typeof critiqueRoutes.runCritique> =>
  useAction(critiqueRoutes.runCritique);

export { useRunCritique };
