import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runOnServer } from "./dev-server-attempt.js";
import { applyConfig, attachApp, controlServer } from "./dev-server-ops.js";
import type { AttachInput, Control } from "./dev-server-ops.js";
import { devServerRuntimeOf } from "./dev-server-runtime.js";

type DevServerFailure = KnownFailure;

interface DevServerRunnerApi {
  readonly attach: (
    input: AttachInput
  ) => Effect.Effect<Awaited<ReturnType<typeof attachApp>>, DevServerFailure>;
  readonly control: (
    projectId: string,
    control: Control
  ) => Effect.Effect<
    Awaited<ReturnType<typeof controlServer>>,
    DevServerFailure
  >;
  readonly setConfig: (input: {
    readonly env?: Record<string, string> | null;
    readonly projectId: string;
    readonly url?: string | null;
  }) => Effect.Effect<
    Awaited<ReturnType<typeof applyConfig>>,
    DevServerFailure
  >;
}

const stopApps = (): Promise<void> =>
  devServerRuntimeOf()?.preview.apps?.stopAll?.() ?? Promise.resolve();

const stopSupervised = Effect.tryPromise(stopApps).pipe(
  Effect.orElseSucceed(() => null)
);

const supervise = Effect.acquireRelease(
  Effect.succeed("dev-server-supervisor"),
  () => stopSupervised
);

class DevServerRunner extends Context.Service<
  DevServerRunner,
  DevServerRunnerApi
>()("design-studio/app/DevServerRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    DevServerRunner,
    Effect.gen(function* build() {
      yield* supervise;

      return DevServerRunner.of({
        attach: Effect.fn("DevServerRunner.attach")(function* run(
          input: AttachInput
        ) {
          return yield* runOnServer((runtime) => attachApp(runtime, input));
        }),
        control: Effect.fn("DevServerRunner.control")(function* run(
          projectId: string,
          control: Control
        ) {
          return yield* runOnServer((runtime) =>
            controlServer(runtime, projectId, control)
          );
        }),
        setConfig: Effect.fn("DevServerRunner.setConfig")(function* run(input) {
          return yield* runOnServer((runtime) => applyConfig(runtime, input));
        }),
      });
    })
  );
}

export { DevServerRunner };

export type { DevServerFailure, DevServerRunnerApi };
