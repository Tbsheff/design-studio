import type { Input } from "@design-studio/actions/_core/action";
import type { listBlock } from "@design-studio/actions/block/list";
import { Effect } from "effect";

import { BlockStore } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type ListBlockInput = Input<typeof listBlock>;

const handle = Effect.fn("block.list")(function* run(input: ListBlockInput) {
  const store = yield* BlockStore;

  return yield* store.list({
    cursor: input.cursor,
    kind: input.kind,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof listBlock>;

export { handle };
