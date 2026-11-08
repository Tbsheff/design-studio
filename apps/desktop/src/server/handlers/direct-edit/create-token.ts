import type { Input } from "@design-studio/actions/_core/action";
import type { createTokenDirectEdit } from "@design-studio/actions/direct-edit/create-token";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type CreateTokenDirectEditInput = Input<typeof createTokenDirectEdit>;

const handle = Effect.fn("direct-edit.createToken")(function* run(
  input: CreateTokenDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.createToken(toRef(input), toBody(input));
}) satisfies Handle<typeof createTokenDirectEdit>;

export { handle };
