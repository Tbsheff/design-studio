import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPattern } from "@design-studio/actions/pattern/inspect";
import { Effect } from "effect";

import { PatternUrlStore } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPatternInput = Input<typeof inspectPattern>;

const handle = Effect.fn("pattern.inspect")(function* run(
  input: InspectPatternInput
) {
  const projects = yield* ProjectStore;
  const store = yield* PatternUrlStore;

  yield* projects.get(input.projectId);

  return yield* store.inspect({
    cursor: input.cursor,
    limit: input.limit,
    url: input.url,
    width: input.width,
  });
}) satisfies Handle<typeof inspectPattern>;

export { handle };
