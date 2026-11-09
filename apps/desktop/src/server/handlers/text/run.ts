import type { Input } from "@design-studio/actions/_core/action";
import type { runText } from "@design-studio/actions/text/run";
import { Effect } from "effect";

import { TextRewriteRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type RunTextInput = Input<typeof runText>;

const handle = Effect.fn("text.run")(function* run(input: RunTextInput) {
  const runner = yield* TextRewriteRunner;

  return yield* runner.run({
    directionId: input.directionId,
    language: input.language,
    layer: input.layer,
    mode: input.mode,
    projectId: input.projectId,
    shouldApply: input.shouldApply,
  });
}) satisfies Handle<typeof runText>;

export { handle };
