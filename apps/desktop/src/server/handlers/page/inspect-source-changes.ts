import type { Input } from "@design-studio/actions/_core/action";
import type { inspectSourceChangesPage } from "@design-studio/actions/page/inspect-source-changes";
import { Effect } from "effect";

import { RouteSourceStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type InspectSourceChangesPageInput = Input<typeof inspectSourceChangesPage>;

const handle = Effect.fn("page.inspectSourceChanges")(function* run(
  input: InspectSourceChangesPageInput
) {
  const store = yield* RouteSourceStore;

  return yield* store.inspectChanges({
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectSourceChangesPage>;

export { handle };
