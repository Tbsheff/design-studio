import type { Input } from "@design-studio/actions/_core/action";
import type { getWalkthrough } from "@design-studio/actions/walkthrough/get";
import { Effect } from "effect";

import { WalkthroughStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type GetWalkthroughInput = Input<typeof getWalkthrough>;

const handle = Effect.fn("walkthrough.get")(function* run(
  input: GetWalkthroughInput
) {
  const store = yield* WalkthroughStore;

  const saved = yield* store.get({
    projectId: input.projectId,
    walkthroughId: input.walkthroughId,
  });

  return {
    ...saved,
    frictions: saved.frictions.slice(0, input.limit),
    steps: saved.steps.slice(0, input.limit),
  };
}) satisfies Handle<typeof getWalkthrough>;

export { handle };
