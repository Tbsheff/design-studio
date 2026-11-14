import type { Input } from "@design-studio/actions/_core/action";
import type { listHunksVersion } from "@design-studio/actions/version/list-hunks";
import { Effect } from "effect";

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
