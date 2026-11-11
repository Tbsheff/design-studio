import type { Input } from "@design-studio/actions/_core/action";
import type { listReference } from "@design-studio/actions/reference/list";
import { Effect } from "effect";

import { ReferencePinStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListReferenceInput = Input<typeof listReference>;

const handle = Effect.fn("reference.list")(function* run(
  input: ListReferenceInput
) {
  const store = yield* ReferencePinStore;

  return yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listReference>;

export { handle };
