import type { Input } from "@design-studio/actions/_core/action";
import type { createCompletion } from "@design-studio/actions/completion/create";
import { Effect } from "effect";

import { CompletionRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type CreateCompletionInput = Input<typeof createCompletion>;

const handle = Effect.fn("completion.create")(function* run(
  input: CreateCompletionInput
) {
  const runner = yield* CompletionRunner;

  return yield* runner.create({
    frame: input.frame,
    maxTokens: input.maxTokens,
    projectId: input.projectId,
    prompt: input.prompt,
    system: input.system,
  });
}) satisfies Handle<typeof createCompletion>;

export { handle };
