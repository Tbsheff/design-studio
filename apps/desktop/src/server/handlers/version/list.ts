import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVersion } from "../../../shared/actions/version/list.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListVersionInput = Input<typeof listVersion>;

const handle = Effect.fn("version.list")(function* run(
  input: ListVersionInput
) {
  const store = yield* VersionStore;

  const items = yield* store.list({
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return { items };
}) satisfies Handle<typeof listVersion>;

export { handle };
