import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer, Semaphore } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import type { CompletionSettings } from "./completion-file.js";
import {
  createCompletionResult,
  setCompletionSettings,
} from "./completion-run.js";
import type {
  CompletionResult,
  CreateCommand,
  SetCommand,
} from "./completion-run.js";

interface CompletionRunnerApi {
  readonly create: (
    command: CreateCommand
  ) => Effect.Effect<
    CompletionResult,
    KnownFailure | Unavailable,
    LocalOrgScope
  >;
  readonly set: (
    command: SetCommand
  ) => Effect.Effect<CompletionSettings, KnownFailure, LocalOrgScope>;
}

class CompletionRunner extends Context.Service<
  CompletionRunner,
  CompletionRunnerApi
>()("design-studio/project-ops/CompletionRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    CompletionRunner,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const lock = yield* Semaphore.make(1);

      return CompletionRunner.of({
        create: Effect.fn("CompletionRunner.create")(function* run(
          command: CreateCommand
        ) {
          yield* projects.get(command.projectId);

          return yield* createCompletionResult(lock, command);
        }),
        set: Effect.fn("CompletionRunner.set")(function* run(
          command: SetCommand
        ) {
          yield* projects.get(command.projectId);

          return yield* setCompletionSettings(lock, command);
        }),
      });
    })
  );
}

export { CompletionRunner };

export type { CompletionRunnerApi };
