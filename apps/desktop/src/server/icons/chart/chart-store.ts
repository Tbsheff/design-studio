import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runChartInspect } from "./chart-run.js";
import type { ChartInspected, InspectChartCommand } from "./chart-run.js";

interface ChartStoreApi {
  readonly inspect: (
    command: InspectChartCommand
  ) => Effect.Effect<ChartInspected, KnownFailure>;
}

class ChartStore extends Context.Service<ChartStore, ChartStoreApi>()(
  "design-studio/icons/ChartStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ChartStore,
    ChartStore.of({
      inspect: Effect.fn("ChartStore.inspect")(function* run(
        command: InspectChartCommand
      ) {
        return yield* runChartInspect(command);
      }),
    })
  );
}

export { ChartStore };

export type { ChartStoreApi };
