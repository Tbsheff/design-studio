import type { Input } from "@design-studio/actions/_core/action";
import type { setCompletion } from "@design-studio/actions/completion/set";
import { Effect } from "effect";

import { CompletionRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetCompletionInput = Input<typeof setCompletion>;

const handle = Effect.fn("completion.set")(function* run(
  input: SetCompletionInput
) {
  const runner = yield* CompletionRunner;

  return yield* runner.set({
    capUsd: input.capUsd,
    isEnabled: input.isEnabled,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setCompletion>;

export { handle };
