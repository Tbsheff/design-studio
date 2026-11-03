import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getRulesDirectEdit } from "../../../shared/actions/direct-edit/get-rules.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetRulesDirectEditInput = Input<typeof getRulesDirectEdit>;

const handle = Effect.fn("direct-edit.getRules")(function* run(
  input: GetRulesDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getRules(toRef(input));
}) satisfies Handle<typeof getRulesDirectEdit>;

export { handle };
