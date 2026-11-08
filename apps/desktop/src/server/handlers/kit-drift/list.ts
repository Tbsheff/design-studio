import type { Input } from "@design-studio/actions/_core/action";
import type { listKitDrift } from "@design-studio/actions/kit-drift/list";
import { Effect } from "effect";

import { KitDriftStore } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type ListKitDriftInput = Input<typeof listKitDrift>;

const handle = Effect.fn("kit-drift.list")(function* run(
  input: ListKitDriftInput
) {
  const store = yield* KitDriftStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    page: input.page,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listKitDrift>;

export { handle };
