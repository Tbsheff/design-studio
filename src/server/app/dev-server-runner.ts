import { Context, Effect, Layer } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import { BadRequestError, NotFoundError } from "../store/errors.js";
import { applyConfig, attachApp, controlServer } from "./dev-server-ops.js";
import type { AttachInput, Control } from "./dev-server-ops.js";
import { devServerRuntimeOf } from "./dev-server-runtime.js";
import type { DevServerRuntime } from "./dev-server-runtime.js";

type DevServerFailure = BadRequest | NotFound;

const NOT_READY =
  "App servers are not ready in this Design Studio process. Restart Design Studio.";

const toFailure = (error: Cause.UnknownError): DevServerFailure => {
  const { cause } = error;

  if (cause instanceof NotFoundError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof BadRequestError || cause instanceof Error) {
    return new BadRequest({ message: cause.message });
  }

  return new BadRequest({ message: String(cause) });
};

const attemptServer = <Value>(
  task: (runtime: DevServerRuntime) => Promise<Value>
): Effect.Effect<Value, DevServerFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = devServerRuntimeOf();

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toFailure(failure))
    );
  });

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

const stopSupervised = Effect.promise(async () => {
  await devServerRuntimeOf()
    ?.preview.apps?.stopAll()
    .catch(() => undefined);
});

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
          return yield* attemptServer((runtime) => attachApp(runtime, input));
        }),
        control: Effect.fn("DevServerRunner.control")(function* run(
          projectId: string,
          control: Control
        ) {
          return yield* attemptServer((runtime) =>
            controlServer(runtime, projectId, control)
          );
        }),
        setConfig: Effect.fn("DevServerRunner.setConfig")(function* run(input) {
          return yield* attemptServer((runtime) => applyConfig(runtime, input));
        }),
      });
    })
  );
}

export { DevServerRunner, attemptServer };

export type { DevServerFailure, DevServerRunnerApi };
