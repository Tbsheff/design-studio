import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyToken } from "../../../shared/actions/token/apply.js";
import { TokenSweepRunner } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyTokenInput = Input<typeof applyToken>;

const handle = Effect.fn("token.apply")(function* run(input: ApplyTokenInput) {
  const sweeper = yield* TokenSweepRunner;

  return yield* sweeper.apply({
    directionId: input.directionId,
    dryRun: input.dryRun ?? true,
    kinds: input.kinds ?? [],
    layer: input.layer ?? null,
    page: input.page ?? null,
    projectId: input.projectId,
    select: input.select ?? null,
  });
}) satisfies Handle<typeof applyToken>;

export { handle };
