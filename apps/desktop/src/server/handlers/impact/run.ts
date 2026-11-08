import type { Input } from "@design-studio/actions/_core/action";
import type { runImpact } from "@design-studio/actions/impact/run";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { ImpactRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunImpactInput = Input<typeof runImpact>;

const handle = Effect.fn("impact.run")(function* run(input: RunImpactInput) {
  const reads = yield* McpReadStore;
  const runner = yield* ImpactRunner;

  return yield* runner.run(reads, {
    directionId: input.directionId,
    file: input.file,
    limit: input.limit,
    phase: input.phase,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof runImpact>;

export { handle };
