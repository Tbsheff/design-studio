import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { applyToken } from "@design-studio/actions/token/apply";
import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyTokenInput = Input<typeof applyToken>;

const handle = Effect.fn("token.apply")(function* run(input: ApplyTokenInput) {
  const sweeper = yield* TokenSweepRunner;

  return yield* sweeper.apply({
    directionId: input.directionId,
    dryRun: input.dryRun,
    kinds: input.kinds,
    layer: input.layer,
    page: input.page,
    projectId: input.projectId,
    select: input.select,
  });
}) satisfies Handle<typeof applyToken>;

export { handle };
