import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { runRulesTestDirectEdit } from "../../../shared/actions/direct-edit/run-rules-test.js";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type RunRulesTestDirectEditInput = Input<typeof runRulesTestDirectEdit>;

const handle = Effect.fn("direct-edit.runRulesTest")(function* run(
  input: RunRulesTestDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.runRulesTest(toRef(input), toFields(input));
}) satisfies Handle<typeof runRulesTestDirectEdit>;

export { handle };
