import { useAction, viewportRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

const useCreateMatrix = (): ActionState<typeof viewportRoutes.createViewport> =>
  useAction(viewportRoutes.createViewport);

export { useCreateMatrix };
