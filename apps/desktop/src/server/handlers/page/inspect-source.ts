import type { Input } from "@design-studio/actions/_core/action";
import type { inspectSourcePage } from "@design-studio/actions/page/inspect-source";
import { Effect } from "effect";

import { RouteSourceStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type InspectSourcePageInput = Input<typeof inspectSourcePage>;

const handle = Effect.fn("page.inspectSource")(function* run(
  input: InspectSourcePageInput
) {
  const store = yield* RouteSourceStore;

  return yield* store.inspect({
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectSourcePage>;

export { handle };
