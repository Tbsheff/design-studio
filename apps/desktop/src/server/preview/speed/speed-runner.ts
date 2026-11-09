import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { attemptMcpRead } from "../mcp-read-core.js";
import { getSpeedSample } from "./speed-read.js";
import { runSpeedPhase } from "./speed-run.js";
import type { SpeedResult, SpeedRunQuery } from "./speed-types.js";

type SpeedRunError = BadRequest | Conflict | NotFound;

interface SpeedRunnerApi {
  readonly run: (
    query: SpeedRunQuery
  ) => Effect.Effect<SpeedResult, SpeedRunError>;
}

class SpeedRunner extends Context.Service<SpeedRunner, SpeedRunnerApi>()(
  "design-studio/preview/SpeedRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    SpeedRunner,
    SpeedRunner.of({
      run: Effect.fn("SpeedRunner.run")(function* run(query: SpeedRunQuery) {
        return yield* runSpeedPhase(
          (sampled) =>
            attemptMcpRead((runtime) => getSpeedSample(runtime, sampled)),
          query
        );
      }),
    })
  );
}

export { SpeedRunner };

export type { SpeedRunnerApi };
