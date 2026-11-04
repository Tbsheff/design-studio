import { critiqueRoutes, useAction } from "./deps.js";
import type { ActionState } from "./deps.js";

interface GetInput {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

const useGetCritique = (
  input: GetInput | null
): ActionState<typeof critiqueRoutes.getCritique> =>
  useAction(critiqueRoutes.getCritique, input);

export { useGetCritique };

export type { GetInput };
