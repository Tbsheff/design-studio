import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDesignSystemDirectEdit } from "../../../shared/actions/direct-edit/get-design-system.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetDesignSystemDirectEditInput = Input<typeof getDesignSystemDirectEdit>;

const handle = Effect.fn("direct-edit.getDesignSystem")(function* run(
  input: GetDesignSystemDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getDesignSystem(toRef(input));
}) satisfies Handle<typeof getDesignSystemDirectEdit>;

export { handle };
