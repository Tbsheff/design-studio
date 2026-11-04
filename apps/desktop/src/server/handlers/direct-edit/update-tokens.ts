import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updateTokensDirectEdit } from "@design-studio/actions/direct-edit/update-tokens";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateTokensDirectEditInput = Input<typeof updateTokensDirectEdit>;

const handle = Effect.fn("direct-edit.updateTokens")(function* run(
  input: UpdateTokensDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.updateTokens(toRef(input), toBody(input));
}) satisfies Handle<typeof updateTokensDirectEdit>;

export { handle };
