import { contentRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useApplyContent = (): ActionState<typeof contentRoutes.applyContent> =>
  useAction(contentRoutes.applyContent);

export { useApplyContent };
