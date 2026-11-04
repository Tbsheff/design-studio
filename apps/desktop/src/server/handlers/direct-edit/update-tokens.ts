import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateTokensDirectEdit } from "../../../shared/actions/direct-edit/update-tokens.js";
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
