import type { Input } from "@design-studio/actions/_core/action";
import type { runBrief } from "@design-studio/actions/brief/run";
import { Effect } from "effect";

import { BriefRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type RunBriefInput = Input<typeof runBrief>;

const handle = Effect.fn("brief.run")(function* run(input: RunBriefInput) {
  const runner = yield* BriefRunner;

  return yield* runner.run({
    projectId: input.projectId,
    prompt: input.prompt,
  });
}) satisfies Handle<typeof runBrief>;

export { handle };
