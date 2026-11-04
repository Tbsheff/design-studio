import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createTokenDirectEdit } from "../../../shared/actions/direct-edit/create-token.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type CreateTokenDirectEditInput = Input<typeof createTokenDirectEdit>;

const handle = Effect.fn("direct-edit.createToken")(function* run(
  input: CreateTokenDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.createToken(toRef(input), toBody(input));
}) satisfies Handle<typeof createTokenDirectEdit>;

export { handle };
