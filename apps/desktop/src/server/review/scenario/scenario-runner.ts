import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { viewportRuntime } from "../../viewport/index.js";
import { applySavedScenario } from "./scenario-apply.js";
import { createScenarios } from "./scenario-create.js";
import type { ScenarioSet } from "./scenario-model.js";
import { runScenarios } from "./scenario-run.js";
import type { ScenarioRun } from "./scenario-run.js";
import type { TargetCommand } from "./scenario-target.js";

interface ApplyCommand extends TargetCommand {
  readonly scenarioId: string | null;
}

interface Applied {
  readonly frameId: string;
  readonly scenarioId: string | null;
  readonly stateId: string | null;
}

interface ScenarioRunnerApi {
  readonly apply: (
    command: ApplyCommand
  ) => Effect.Effect<Applied, KnownFailure>;
  readonly create: (
    command: TargetCommand
  ) => Effect.Effect<ScenarioSet, KnownFailure>;
  readonly run: (
    command: TargetCommand
  ) => Effect.Effect<ScenarioRun, KnownFailure>;
}

class ScenarioRunner extends Context.Service<
  ScenarioRunner,
  ScenarioRunnerApi
>()("design-studio/review/ScenarioRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ScenarioRunner,
    ScenarioRunner.of({
      apply: Effect.fn("ScenarioRunner.apply")(function* run(
        command: ApplyCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* applySavedScenario(runtime, command);
      }),
      create: Effect.fn("ScenarioRunner.create")(function* run(
        command: TargetCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* createScenarios(runtime, command);
      }),
      run: Effect.fn("ScenarioRunner.run")(function* run(
        command: TargetCommand
      ) {
        const runtime = yield* viewportRuntime;

        return yield* runScenarios(runtime, command);
      }),
    })
  );
}

export { ScenarioRunner };

export type { ApplyCommand, Applied, ScenarioRunnerApi };
