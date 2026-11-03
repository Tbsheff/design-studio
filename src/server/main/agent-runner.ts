import { Effect, Layer } from "effect";

import {
  AgentSdkClient,
  RunRunner,
  createAgentRunner,
  toSdkOptions,
} from "../agent/index.js";
import type {
  AgentRunnerDeps,
  RunDriver,
  RunFibers,
  SdkDriverOptions,
} from "../agent/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import type { StudioRuntime } from "./runtime.js";

type AgentServices = AgentSdkClient | RunRunner;

interface DriverCell {
  driver: Promise<RunDriver> | null;
}

const toAgentSdkLayer = (
  mode: ServerConfig["agentMode"]
): Layer.Layer<AgentSdkClient> => {
  if (mode === "mock") {
    return AgentSdkClient.layerTest;
  }

  return AgentSdkClient.layer;
};

const toAgentLayer = (
  mode: ServerConfig["agentMode"]
): Layer.Layer<AgentServices> =>
  Layer.mergeAll(RunRunner.layer, toAgentSdkLayer(mode));

const toRunFibers = (runtime: StudioRuntime): RunFibers => {
  const aborts = new Map<string, () => void>();

  return {
    interrupt: (runId) => {
      aborts.get(runId)?.();
      aborts.delete(runId);
      runtime.runFork(
        Effect.gen(function* interruptRun() {
          const runner = yield* RunRunner;

          yield* runner.interrupt(runId);
        })
      );
    },
    launch: (runId, done, abort) => {
      aborts.set(runId, abort);
      runtime.runFork(
        Effect.gen(function* launchRun() {
          const runner = yield* RunRunner;

          yield* runner.launch(runId, done, abort);
          yield* Effect.tryPromise(() => done).pipe(Effect.ignore);
          aborts.delete(runId);
        })
      );
    },
  };
};

const toRunDriver = (
  runtime: StudioRuntime,
  options: SdkDriverOptions
): RunDriver => {
  const cell: DriverCell = { driver: null };

  return async (input) => {
    cell.driver ??= runtime.runPromise(
      Effect.gen(function* resolveDriver() {
        const sdk = yield* AgentSdkClient;

        return yield* sdk.createDriver(options);
      })
    );

    const driver = await cell.driver;

    return driver(input);
  };
};

const bootAgentRunner = (
  deps: AgentRunnerDeps,
  runtime: StudioRuntime
): ReturnType<typeof createAgentRunner> =>
  createAgentRunner(
    { ...deps, runtime },
    {
      driver: toRunDriver(runtime, toSdkOptions({ ...deps, runtime })),
      fibers: toRunFibers(runtime),
    }
  );

export { bootAgentRunner, toAgentLayer };

export type { AgentServices };
