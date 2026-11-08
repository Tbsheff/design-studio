import type { Input } from "@design-studio/actions/_core/action";
import type { listComponentsDirectEdit } from "@design-studio/actions/direct-edit/list-components";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListComponentsDirectEditInput = Input<typeof listComponentsDirectEdit>;

const handle = Effect.fn("direct-edit.listComponents")(function* run(
  input: ListComponentsDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listComponents(toRef(input));
}) satisfies Handle<typeof listComponentsDirectEdit>;

export { handle };
