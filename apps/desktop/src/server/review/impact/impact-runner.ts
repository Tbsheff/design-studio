import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { runImpactPhase } from "./impact-run.js";
import type { ImpactReads } from "./impact-run.js";
import type { ImpactResult, ImpactRunQuery } from "./impact-types.js";

type ImpactRunError = BadRequest | Conflict | NotFound;

interface ImpactRunnerApi {
  readonly run: (
    reads: ImpactReads,
    query: ImpactRunQuery
  ) => Effect.Effect<ImpactResult, ImpactRunError>;
}

class ImpactRunner extends Context.Service<ImpactRunner, ImpactRunnerApi>()(
  "design-studio/review/ImpactRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ImpactRunner,
    ImpactRunner.of({
      run: Effect.fn("ImpactRunner.run")(function* run(
        reads: ImpactReads,
        query: ImpactRunQuery
      ) {
        return yield* runImpactPhase(reads, query);
      }),
    })
  );
}

export { ImpactRunner };

export type { ImpactRunnerApi };
