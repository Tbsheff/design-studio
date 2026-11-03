import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVersions } from "../../../shared/actions/versions/list.js";
import { VersionStore } from "../../store/version-store.js";
import type { Handle } from "../_core/handler.js";

type ListVersionsInput = Input<typeof listVersions>;

const handle = Effect.fn("versions.list")(function* run(
  input: ListVersionsInput
) {
  const store = yield* VersionStore;

  const items = yield* store.list({
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return { items };
}) satisfies Handle<typeof listVersions>;

export { handle };
