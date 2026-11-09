import type { Input } from "@design-studio/actions/_core/action";
import type { listUsageComponent } from "@design-studio/actions/component/list-usage";
import { Effect } from "effect";

import { ComponentUsageStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListUsageComponentInput = Input<typeof listUsageComponent>;

const handle = Effect.fn("component.listUsage")(function* run(
  input: ListUsageComponentInput
) {
  const store = yield* ComponentUsageStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    isUnusedOnly: input.isUnusedOnly,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listUsageComponent>;

export { handle };
