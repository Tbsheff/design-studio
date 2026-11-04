import type { Input } from "@design-studio/actions/_core/action";
import type { getCritique } from "@design-studio/actions/critique/get";
import { Effect } from "effect";

import { CritiqueStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type GetCritiqueInput = Input<typeof getCritique>;

const handle = Effect.fn("critique.get")(function* run(
  input: GetCritiqueInput
) {
  const store = yield* CritiqueStore;

  return yield* store.get({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof getCritique>;

export { handle };
