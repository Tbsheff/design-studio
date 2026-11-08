import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runChartInsert } from "./chart-run.js";
import type { ChartInserted, InsertChartCommand } from "./chart-run.js";

interface ChartWriterApi {
  readonly insert: (
    command: InsertChartCommand
  ) => Effect.Effect<ChartInserted, KnownFailure>;
}

class ChartWriter extends Context.Service<ChartWriter, ChartWriterApi>()(
  "design-studio/icons/ChartWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ChartWriter,
    ChartWriter.of({
      insert: Effect.fn("ChartWriter.insert")(function* run(
        command: InsertChartCommand
      ) {
        return yield* runChartInsert(command);
      }),
    })
  );
}

export { ChartWriter };

export type { ChartWriterApi };
