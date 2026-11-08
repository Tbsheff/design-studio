import { devStatusRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useSetDevStatus = (): ActionState<typeof devStatusRoutes.setDevStatus> =>
  useAction(devStatusRoutes.setDevStatus);

export { useSetDevStatus };
