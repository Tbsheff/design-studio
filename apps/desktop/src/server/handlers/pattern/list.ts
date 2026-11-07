import type { Input } from "@design-studio/actions/_core/action";
import type { listPattern } from "@design-studio/actions/pattern/list";
import { Effect } from "effect";

import { PatternStore } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListPatternInput = Input<typeof listPattern>;

const handle = Effect.fn("pattern.list")(function* run(
  input: ListPatternInput
) {
  const store = yield* PatternStore;

  return yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    query: input.query,
    tag: input.tag,
  });
}) satisfies Handle<typeof listPattern>;

export { handle };
