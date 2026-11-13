import type { Input } from "@design-studio/actions/_core/action";
import type { inspectChangesVersion } from "@design-studio/actions/version/inspect-changes";
import { Effect } from "effect";

import { ChangeStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectChangesVersionInput = Input<typeof inspectChangesVersion>;

const handle = Effect.fn("version.inspectChanges")(function* run(
  input: InspectChangesVersionInput
) {
  const store = yield* ChangeStore;

  return yield* store.layers({
    directionId: input.directionId,
    from: input.from,
    projectId: input.projectId,
    to: input.to,
  });
}) satisfies Handle<typeof inspectChangesVersion>;

export { handle };
