import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { runRulesTestDirectEdit } from "@design-studio/actions/direct-edit/run-rules-test";
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
