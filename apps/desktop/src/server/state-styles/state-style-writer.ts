import type {
  ForcedStateChange,
  StateStyleResult,
} from "@design-studio/contracts/state-styles";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runStateStyleForced, runStateStyleSet } from "./state-style-run.js";
import type {
  SetForcedStateStyleCommand,
  SetStateStyleCommand,
} from "./state-style-run.js";

interface StateStyleWriterApi {
  readonly set: (
    command: SetStateStyleCommand
  ) => Effect.Effect<StateStyleResult, KnownFailure>;
  readonly setForced: (
    command: SetForcedStateStyleCommand
  ) => Effect.Effect<ForcedStateChange, KnownFailure>;
}

class StateStyleWriter extends Context.Service<
  StateStyleWriter,
  StateStyleWriterApi
>()("design-studio/state-styles/StateStyleWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    StateStyleWriter,
    StateStyleWriter.of({
      set: Effect.fn("StateStyleWriter.set")(function* run(
        command: SetStateStyleCommand
      ) {
        return yield* runStateStyleSet(command);
      }),
      setForced: Effect.fn("StateStyleWriter.setForced")(function* run(
        command: SetForcedStateStyleCommand
      ) {
        return yield* runStateStyleForced(command);
      }),
    })
  );
}

export { StateStyleWriter };

export type { StateStyleWriterApi };
