import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getTweaksDirectEdit } from "../../../shared/actions/direct-edit/get-tweaks.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetTweaksDirectEditInput = Input<typeof getTweaksDirectEdit>;

const handle = Effect.fn("direct-edit.getTweaks")(function* run(
  input: GetTweaksDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getTweaks(toRef(input));
}) satisfies Handle<typeof getTweaksDirectEdit>;

export { handle };
