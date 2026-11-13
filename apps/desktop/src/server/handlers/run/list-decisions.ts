import type { Input } from "@design-studio/actions/_core/action";
import type { listDecisionsRun } from "@design-studio/actions/run/list-decisions";
import { Effect } from "effect";

import { RunDecisionStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type ListDecisionsRunInput = Input<typeof listDecisionsRun>;

const handle = Effect.fn("run.listDecisions")(function* run(
  input: ListDecisionsRunInput
) {
  const store = yield* RunDecisionStore;
  const decisions = yield* store.list(input.projectId, input.runId);

  return { items: decisions.slice(0, input.limit), next: null };
}) satisfies Handle<typeof listDecisionsRun>;

export { handle };
