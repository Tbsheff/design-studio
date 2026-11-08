import { screenRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useCreateScreen = (): ActionState<typeof screenRoutes.createScreen> =>
  useAction(screenRoutes.createScreen);

export { useCreateScreen };
