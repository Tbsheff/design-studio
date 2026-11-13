import type { Input } from "@design-studio/actions/_core/action";
import type { createDecisionRun } from "@design-studio/actions/run/create-decision";
import { Effect } from "effect";

import { RunDecisionWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type CreateDecisionRunInput = Input<typeof createDecisionRun>;

const handle = Effect.fn("run.createDecision")(function* run(
  input: CreateDecisionRunInput
) {
  const writer = yield* RunDecisionWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createDecisionRun>;

export { handle };
