import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type { StoredIntegration } from "./integration-model.js";
import {
  createSavedIntegration,
  deleteSavedIntegration,
  runSavedIntegration,
  updateSavedIntegration,
} from "./integration-run.js";
import type {
  CreateIntegrationCommand,
  UpdateIntegrationCommand,
} from "./integration-run.js";

interface IntegrationDeleted {
  readonly id: string;
  readonly name: string;
}

interface IntegrationWriterApi {
  readonly create: (
    command: CreateIntegrationCommand
  ) => Effect.Effect<StoredIntegration, KnownFailure>;
  readonly delete: (
    id: string
  ) => Effect.Effect<IntegrationDeleted, KnownFailure>;
  readonly run: (id: string) => Effect.Effect<StoredIntegration, KnownFailure>;
  readonly update: (
    command: UpdateIntegrationCommand
  ) => Effect.Effect<StoredIntegration, KnownFailure>;
}

class IntegrationWriter extends Context.Service<
  IntegrationWriter,
  IntegrationWriterApi
>()("design-studio/integration/IntegrationWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    IntegrationWriter,
    IntegrationWriter.of({
      create: Effect.fn("IntegrationWriter.create")(function* run(
        command: CreateIntegrationCommand
      ) {
        return yield* createSavedIntegration(command);
      }),
      delete: Effect.fn("IntegrationWriter.delete")(function* run(id: string) {
        return yield* deleteSavedIntegration(id);
      }),
      run: Effect.fn("IntegrationWriter.run")(function* run(id: string) {
        return yield* runSavedIntegration(id);
      }),
      update: Effect.fn("IntegrationWriter.update")(function* run(
        command: UpdateIntegrationCommand
      ) {
        return yield* updateSavedIntegration(command);
      }),
    })
  );
}

export { IntegrationWriter };

export type { IntegrationDeleted, IntegrationWriterApi };
