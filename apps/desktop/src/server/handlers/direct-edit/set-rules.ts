import type { Input } from "@design-studio/actions/_core/action";
import type { setRulesDirectEdit } from "@design-studio/actions/direct-edit/set-rules";
import { Effect } from "effect";

import { toFields, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetRulesDirectEditInput = Input<typeof setRulesDirectEdit>;

const handle = Effect.fn("direct-edit.setRules")(function* run(
  input: SetRulesDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setRules(toRef(input), toFields(input));
}) satisfies Handle<typeof setRulesDirectEdit>;

export { handle };
