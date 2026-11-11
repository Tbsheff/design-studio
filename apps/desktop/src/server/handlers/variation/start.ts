import type { Input } from "@design-studio/actions/_core/action";
import type { startVariation } from "@design-studio/actions/variation/start";
import { Effect } from "effect";

import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StartVariationInput = Input<typeof startVariation>;

const handle = Effect.fn("variation.start")(function* run(
  input: StartVariationInput
) {
  const writer = yield* RunLogWriter;

  return yield* writer.startVariations({
    attachmentIds: input.attachmentIds,
    briefs: input.briefs,
    count: input.count,
    fromDirectionId: input.fromDirectionId,
    level: input.level,
    projectId: input.projectId,
    prompt: input.prompt,
  });
}) satisfies Handle<typeof startVariation>;

export { handle };
