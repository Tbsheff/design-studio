import type { Input } from "@design-studio/actions/_core/action";
import type { updateText } from "@design-studio/actions/text/update";
import { Effect } from "effect";

import { TextSearchWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateTextInput = Input<typeof updateText>;

const handle = Effect.fn("text.update")(function* run(input: UpdateTextInput) {
  const writer = yield* TextSearchWriter;

  return yield* writer.update({
    directionId: input.directionId,
    projectId: input.projectId,
    request: {
      caseSensitive: input.caseSensitive,
      glob: input.glob,
      ids: input.ids,
      query: input.query,
      regex: input.regex,
      replace: input.replace,
      wholeWord: input.wholeWord,
    },
  });
}) satisfies Handle<typeof updateText>;

export { handle };
