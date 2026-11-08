import { screenRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useDuplicateScreen = (): ActionState<
  typeof screenRoutes.duplicateScreen
> => useAction(screenRoutes.duplicateScreen);

export { useDuplicateScreen };
