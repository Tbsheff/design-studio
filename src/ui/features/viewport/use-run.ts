import { useAction, viewportRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

type RunInput = Parameters<
  ActionState<typeof viewportRoutes.runViewport>["run"]
>[0];

const useRunMatrix = (): ActionState<typeof viewportRoutes.runViewport> =>
  useAction(viewportRoutes.runViewport);

export { useRunMatrix };

export type { RunInput };
