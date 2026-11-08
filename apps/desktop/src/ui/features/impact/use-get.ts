import type { WireInput } from "@design-studio/actions/_core/action";
import type { getImpact } from "@design-studio/actions/impact/get";

import { impactRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

const useGetImpact = (
  input: WireInput<typeof getImpact>
): ActionState<typeof impactRoutes.getImpact> =>
  useAction(impactRoutes.getImpact, input);

export { useGetImpact };
