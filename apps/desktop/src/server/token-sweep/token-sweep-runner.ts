import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { deleteTokenIn, renameTokenIn, sweepTokens } from "./sweep-tokens.js";
import type { SweepCommand, SweepResult } from "./sweep-tokens.js";
import type {
  RemoveCommand,
  RenameCommand,
  TokenEditResult,
} from "./token-edit-types.js";
import { attemptSweep } from "./token-sweep-runtime.js";

interface TokenSweepRunnerApi {
  readonly apply: (
    command: SweepCommand
  ) => Effect.Effect<SweepResult, KnownFailure>;
  readonly remove: (
    command: RemoveCommand
  ) => Effect.Effect<TokenEditResult, KnownFailure>;
  readonly rename: (
    command: RenameCommand
  ) => Effect.Effect<TokenEditResult, KnownFailure>;
}

class TokenSweepRunner extends Context.Service<
  TokenSweepRunner,
  TokenSweepRunnerApi
>()("design-studio/token-sweep/TokenSweepRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    TokenSweepRunner,
    TokenSweepRunner.of({
      apply: Effect.fn("TokenSweepRunner.apply")(function* run(
        command: SweepCommand
      ) {
        return yield* attemptSweep((runtime) => sweepTokens(runtime, command));
      }),
      remove: Effect.fn("TokenSweepRunner.remove")(function* run(
        command: RemoveCommand
      ) {
        return yield* attemptSweep((runtime) =>
          runtime.withDirection(
            command.projectId,
            command.directionId,
            (project, direction) =>
              deleteTokenIn(runtime, { direction, project }, command)
          )
        );
      }),
      rename: Effect.fn("TokenSweepRunner.rename")(function* run(
        command: RenameCommand
      ) {
        return yield* attemptSweep((runtime) =>
          runtime.withDirection(
            command.projectId,
            command.directionId,
            (project, direction) =>
              renameTokenIn(runtime, { direction, project }, command)
          )
        );
      }),
    })
  );
}

export { TokenSweepRunner };

export type { TokenSweepRunnerApi };
