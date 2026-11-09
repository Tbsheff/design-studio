import type { Input } from "@design-studio/actions/_core/action";
import type { listUsageToken } from "@design-studio/actions/token/list-usage";
import { Effect } from "effect";

import { TokenUsageStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListUsageTokenInput = Input<typeof listUsageToken>;

const handle = Effect.fn("token.listUsage")(function* run(
  input: ListUsageTokenInput
) {
  const store = yield* TokenUsageStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    isUnusedOnly: input.isUnusedOnly,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listUsageToken>;

export { handle };
