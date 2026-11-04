import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listHistoryVersion } from "@design-studio/actions/version/list-history";
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
