import type { StateListResult } from "@design-studio/contracts/state-styles";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runStateStyleInspect } from "./state-style-run.js";
import type { InspectStateStyleCommand } from "./state-style-run.js";

interface StateStyleStoreApi {
  readonly inspect: (
    command: InspectStateStyleCommand
  ) => Effect.Effect<StateListResult, KnownFailure>;
}

class StateStyleStore extends Context.Service<
  StateStyleStore,
  StateStyleStoreApi
>()("design-studio/state-styles/StateStyleStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    StateStyleStore,
    StateStyleStore.of({
      inspect: Effect.fn("StateStyleStore.inspect")(function* run(
        command: InspectStateStyleCommand
      ) {
        return yield* runStateStyleInspect(command);
      }),
    })
  );
}

export { StateStyleStore };

export type { StateStyleStoreApi };
