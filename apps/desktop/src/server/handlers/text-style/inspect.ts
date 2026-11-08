import type { Input } from "@design-studio/actions/_core/action";
import type { inspectTextStyle } from "@design-studio/actions/text-style/inspect";
import { Effect } from "effect";

import { TextStyleStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type InspectTextStyleInput = Input<typeof inspectTextStyle>;

const handle = Effect.fn("text-style.inspect")(function* run(
  input: InspectTextStyleInput
) {
  const store = yield* TextStyleStore;

  return yield* store.inspect({
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof inspectTextStyle>;

export { handle };
