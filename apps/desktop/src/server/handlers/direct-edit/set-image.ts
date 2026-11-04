import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setImageDirectEdit } from "../../../shared/actions/direct-edit/set-image.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetImageDirectEditInput = Input<typeof setImageDirectEdit>;

const handle = Effect.fn("direct-edit.setImage")(function* run(
  input: SetImageDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setImage(toRef(input), toBody(input));
}) satisfies Handle<typeof setImageDirectEdit>;

export { handle };
