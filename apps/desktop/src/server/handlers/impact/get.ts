import type { Input } from "@design-studio/actions/_core/action";
import type { getImpact } from "@design-studio/actions/impact/get";
import { Effect } from "effect";

import { ImpactStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type GetImpactInput = Input<typeof getImpact>;

const handle = Effect.fn("impact.get")(function* run(input: GetImpactInput) {
  const store = yield* ImpactStore;

  const result = yield* store.get({
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return { ...result, routes: result.routes.slice(0, input.limit) };
}) satisfies Handle<typeof getImpact>;

export { handle };
