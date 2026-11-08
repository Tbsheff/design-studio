import type { Input } from "@design-studio/actions/_core/action";
import type { getPattern } from "@design-studio/actions/pattern/get";
import { Effect } from "effect";

import { PatternStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type GetPatternInput = Input<typeof getPattern>;

const handle = Effect.fn("pattern.get")(function* run(input: GetPatternInput) {
  const store = yield* PatternStore;

  const pattern = yield* store.get(input.patternId);

  return { pattern };
}) satisfies Handle<typeof getPattern>;

export { handle };
