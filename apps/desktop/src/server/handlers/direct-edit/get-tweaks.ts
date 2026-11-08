import type { Input } from "@design-studio/actions/_core/action";
import type { getTweaksDirectEdit } from "@design-studio/actions/direct-edit/get-tweaks";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type GetTweaksDirectEditInput = Input<typeof getTweaksDirectEdit>;

const handle = Effect.fn("direct-edit.getTweaks")(function* run(
  input: GetTweaksDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getTweaks(toRef(input));
}) satisfies Handle<typeof getTweaksDirectEdit>;

export { handle };
