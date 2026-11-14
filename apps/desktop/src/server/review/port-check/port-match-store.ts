import type { PortMatch } from "@design-studio/actions/port/schema";
import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { inspectPortWrites } from "./port-apply-plan.js";
import type { PortApplyTarget, PortWritePlan } from "./port-apply-plan.js";
import { toPortApplyPlan } from "./port-apply.js";
import type { PortCheckQuery, PortReads } from "./port-check-query.js";
import { readPortCheck, readPortMatch } from "./port-match-read.js";

interface PortApplyCheck {
  readonly match: PortMatch;
  readonly plan: PortWritePlan;
}

interface PortMatchStoreApi {
  readonly inspect: (
    reads: PortReads,
    query: PortCheckQuery
  ) => Effect.Effect<PortMatch, KnownFailure>;
  readonly planApply: (
    reads: PortReads,
    query: PortCheckQuery,
    target: PortApplyTarget
  ) => Effect.Effect<PortApplyCheck, KnownFailure>;
}

class PortMatchStore extends Context.Service<
  PortMatchStore,
  PortMatchStoreApi
>()("design-studio/review/PortMatchStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PortMatchStore,
    PortMatchStore.of({
      inspect: Effect.fn("PortMatchStore.inspect")(function* run(
        reads: PortReads,
        query: PortCheckQuery
      ) {
        return yield* readPortMatch(reads, query);
      }),
      planApply: Effect.fn("PortMatchStore.planApply")(function* run(
        reads: PortReads,
        query: PortCheckQuery,
        target: PortApplyTarget
      ) {
        const check = yield* readPortCheck(reads, query);

        const plan = yield* attemptKnown(() =>
          inspectPortWrites(
            target,
            toPortApplyPlan(check.pairs, check.appNodes)
          )
        );

        const found: PortApplyCheck = { match: check.match, plan };

        return found;
      }),
    })
  );
}

export { PortMatchStore };

export type { PortApplyCheck, PortMatchStoreApi };
