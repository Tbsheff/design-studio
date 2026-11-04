import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getDesignSystemDirectEdit } from "@design-studio/actions/direct-edit/get-design-system";
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
