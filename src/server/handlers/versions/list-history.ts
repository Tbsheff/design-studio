import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listHistoryVersions } from "../../../shared/actions/versions/list-history.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListHistoryVersionsInput = Input<typeof listHistoryVersions>;

const handle = Effect.fn("versions.listHistory")(function* run(
  input: ListHistoryVersionsInput
) {
  const store = yield* VersionStore;

  return yield* store.history({
    directionId: input.directionId,
    limit: input.limit ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listHistoryVersions>;

export { handle };
