import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setVectorDirectEdit } from "../../../shared/actions/direct-edit/set-vector.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetVectorDirectEditInput = Input<typeof setVectorDirectEdit>;

const handle = Effect.fn("direct-edit.setVector")(function* run(
  input: SetVectorDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setVector(toRef(input), toBody(input));
}) satisfies Handle<typeof setVectorDirectEdit>;

export { handle };
