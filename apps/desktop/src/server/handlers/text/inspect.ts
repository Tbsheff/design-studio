import type { Input } from "@design-studio/actions/_core/action";
import type { inspectText } from "@design-studio/actions/text/inspect";
import { Effect } from "effect";

import { TextSearchStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type InspectTextInput = Input<typeof inspectText>;

const handle = Effect.fn("text.inspect")(function* run(
  input: InspectTextInput
) {
  const store = yield* TextSearchStore;

  return yield* store.inspect({
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    query: {
      caseSensitive: input.caseSensitive,
      glob: input.glob,
      query: input.query,
      regex: input.regex,
      wholeWord: input.wholeWord,
    },
  });
}) satisfies Handle<typeof inspectText>;

export { handle };
