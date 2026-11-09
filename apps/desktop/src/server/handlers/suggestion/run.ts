import type { Input } from "@design-studio/actions/_core/action";
import type { runSuggestion } from "@design-studio/actions/suggestion/run";
import { Effect } from "effect";

import { SuggestionRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type RunSuggestionInput = Input<typeof runSuggestion>;

const handle = Effect.fn("suggestion.run")(function* run(
  input: RunSuggestionInput
) {
  const runner = yield* SuggestionRunner;

  return yield* runner.run({
    directionId: input.directionId,
    projectId: input.projectId,
    runId: input.runId,
  });
}) satisfies Handle<typeof runSuggestion>;

export { handle };
