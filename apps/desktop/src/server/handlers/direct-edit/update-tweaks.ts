import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updateTweaksDirectEdit } from "@design-studio/actions/direct-edit/update-tweaks";
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
