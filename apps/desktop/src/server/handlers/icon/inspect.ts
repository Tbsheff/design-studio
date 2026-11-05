import type { Input } from "@design-studio/actions/_core/action";
import type { inspectIcon } from "@design-studio/actions/icon/inspect";
import { Effect } from "effect";

import { IconStore } from "../../icons/index.js";
import type { Handle } from "../_core/handler.js";

type InspectIconInput = Input<typeof inspectIcon>;

const handle = Effect.fn("icon.inspect")(function* run(
  input: InspectIconInput
) {
  const store = yield* IconStore;

  return yield* store.inspect({
    directionId: input.directionId,
    library: input.library,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof inspectIcon>;

export { handle };
