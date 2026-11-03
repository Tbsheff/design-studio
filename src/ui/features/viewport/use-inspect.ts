import { useAction, viewportRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

type InspectInput = Parameters<
  ActionState<typeof viewportRoutes.inspectViewport>["run"]
>[0];

const useInspectMatrix = (
  input: InspectInput | null
): ActionState<typeof viewportRoutes.inspectViewport> =>
  useAction(viewportRoutes.inspectViewport, input);

export { useInspectMatrix };

export type { InspectInput };
