import { useAction, versionRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

const useRestoreVersion = (): ActionState<
  typeof versionRoutes.restoreVersion
> => useAction(versionRoutes.restoreVersion);

export { useRestoreVersion };
