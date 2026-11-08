import type { Input } from "@design-studio/actions/_core/action";
import type { getStacking } from "@design-studio/actions/stacking/get";
import { Effect } from "effect";

import { StackingStore } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type GetStackingInput = Input<typeof getStacking>;

const handle = Effect.fn("stacking.get")(function* run(
  input: GetStackingInput
) {
  const store = yield* StackingStore;

  return yield* store.get({
    breakpoint: input.breakpoint,
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });
}) satisfies Handle<typeof getStacking>;

export { handle };
