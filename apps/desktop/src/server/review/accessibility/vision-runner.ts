import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { VisionReport } from "./vision-report.js";
import { runVision } from "./vision-run.js";
import type { RunVisionCommand } from "./vision-run.js";

interface VisionRunnerApi {
  readonly run: (
    command: RunVisionCommand
  ) => Effect.Effect<VisionReport, KnownFailure>;
}

class VisionRunner extends Context.Service<VisionRunner, VisionRunnerApi>()(
  "design-studio/review/VisionRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    VisionRunner,
    VisionRunner.of({
      run: Effect.fn("VisionRunner.run")(function* run(
        command: RunVisionCommand
      ) {
        return yield* runVision(command);
      }),
    })
  );
}

export { VisionRunner };

export type { VisionRunnerApi };
