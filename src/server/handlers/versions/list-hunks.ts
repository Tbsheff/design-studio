import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listHunksVersions } from "../../../shared/actions/versions/list-hunks.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListHunksVersionsInput = Input<typeof listHunksVersions>;

const handle = Effect.fn("versions.listHunks")(function* run(
  input: ListHunksVersionsInput
) {
  const store = yield* VersionStore;

  return yield* store.hunks({
    file: input.file,
    from: input.from,
    projectId: input.projectId,
    to: input.to,
  });
}) satisfies Handle<typeof listHunksVersions>;

export { handle };
