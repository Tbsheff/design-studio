import type { Input } from "@design-studio/actions/_core/action";
import type { getRulesDirectEdit } from "@design-studio/actions/direct-edit/get-rules";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type GetRulesDirectEditInput = Input<typeof getRulesDirectEdit>;

const handle = Effect.fn("direct-edit.getRules")(function* run(
  input: GetRulesDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getRules(toRef(input));
}) satisfies Handle<typeof getRulesDirectEdit>;

export { handle };
