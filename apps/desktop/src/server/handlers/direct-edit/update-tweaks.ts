import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateTweaksDirectEdit } from "../../../shared/actions/direct-edit/update-tweaks.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateTweaksDirectEditInput = Input<typeof updateTweaksDirectEdit>;

const handle = Effect.fn("direct-edit.updateTweaks")(function* run(
  input: UpdateTweaksDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.commitTweaks(toRef(input), toBody(input));
}) satisfies Handle<typeof updateTweaksDirectEdit>;

export { handle };
