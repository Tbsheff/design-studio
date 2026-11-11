import { Context, Effect, Layer } from "effect";

import type { RunDriver } from "./lifecycle.js";
import type { createMockDriver } from "./mock.js";
import { createSdkDriver } from "./sdk-driver.js";
import type { SdkDriverOptions } from "./sdk-driver.js";

interface AgentSdkClientApi {
  readonly createDriver: (
    options: SdkDriverOptions
  ) => Effect.Effect<RunDriver>;
}

type MockDriverOptions = Parameters<typeof createMockDriver>[0];

const toMockOptions = (options: SdkDriverOptions): MockDriverOptions => {
  if (options.canvas) {
    return { canvas: options.canvas, preview: options.preview };
  }

  return { preview: options.preview };
};

class AgentSdkClient extends Context.Service<
  AgentSdkClient,
  AgentSdkClientApi
>()("design-studio/agent/AgentSdkClient") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    AgentSdkClient,
    AgentSdkClient.of({
      createDriver: Effect.fn("AgentSdkClient.createDriver")(function* run(
        options: SdkDriverOptions
      ) {
        return yield* Effect.sync(() => createSdkDriver(options));
      }),
    })
  );

  public static readonly layerTest = Layer.succeed(
    AgentSdkClient,
    AgentSdkClient.of({
      createDriver: Effect.fn("AgentSdkClient.createDriver")(function* run(
        options: SdkDriverOptions
      ) {
        const { createMockDriver } = yield* Effect.promise(
          () => import("./mock.js")
        );

        const { toPrototypeDriver } = yield* Effect.promise(
          () => import("./mock-prototype.js")
        );

        return toPrototypeDriver(
          createMockDriver(toMockOptions(options)),
          options.runtime ?? null
        );
      }),
    })
  );
}

export { AgentSdkClient };

export type { AgentSdkClientApi };
