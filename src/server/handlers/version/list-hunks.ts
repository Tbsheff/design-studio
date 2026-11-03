import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listHunksVersion } from "../../../shared/actions/version/list-hunks.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListHunksVersionInput = Input<typeof listHunksVersion>;

const handle = Effect.fn("version.listHunks")(function* run(
  input: ListHunksVersionInput
) {
  const store = yield* VersionStore;

  return yield* store.hunks({
    file: input.file,
    from: input.from,
    projectId: input.projectId,
    to: input.to,
  });
}) satisfies Handle<typeof listHunksVersion>;

export { handle };
