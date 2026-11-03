import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setRulesDirectEdit } from "../../../shared/actions/direct-edit/set-rules.js";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetRulesDirectEditInput = Input<typeof setRulesDirectEdit>;

const handle = Effect.fn("direct-edit.setRules")(function* run(
  input: SetRulesDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setRules(toRef(input), toFields(input));
}) satisfies Handle<typeof setRulesDirectEdit>;

export { handle };
