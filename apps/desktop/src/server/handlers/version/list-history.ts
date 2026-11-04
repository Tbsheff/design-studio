import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listHistoryVersion } from "../../../shared/actions/version/list-history.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListHistoryVersionInput = Input<typeof listHistoryVersion>;

const handle = Effect.fn("version.listHistory")(function* run(
  input: ListHistoryVersionInput
) {
  const store = yield* VersionStore;

  return yield* store.history({
    directionId: input.directionId,
    limit: input.limit ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listHistoryVersion>;

export { handle };
