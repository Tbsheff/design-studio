import type { Input } from "@design-studio/actions/_core/action";
import type { listClassesToken } from "@design-studio/actions/token/list-classes";
import { Effect } from "effect";

import { TokenClassStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListClassesTokenInput = Input<typeof listClassesToken>;

const handle = Effect.fn("token.listClasses")(function* run(
  input: ListClassesTokenInput
) {
  const store = yield* TokenClassStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof listClassesToken>;

export { handle };
