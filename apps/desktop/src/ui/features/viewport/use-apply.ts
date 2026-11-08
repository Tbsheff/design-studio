import { useAction, viewportRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

type ApplyInput = Parameters<
  ActionState<typeof viewportRoutes.applyViewport>["run"]
>[0];

const useApplyViewport = (): ActionState<typeof viewportRoutes.applyViewport> =>
  useAction(viewportRoutes.applyViewport);

export { useApplyViewport };

export type { ApplyInput };
