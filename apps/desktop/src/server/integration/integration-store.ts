import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type {
  IntegrationListCommand,
  IntegrationPage,
  StoredIntegration,
} from "./integration-model.js";
import { toIntegrationPage } from "./integration-page.js";
import { getSaved } from "./integration-run.js";
import { listSavedIntegrations } from "./integration-saved.js";

interface IntegrationStoreApi {
  readonly get: (id: string) => Effect.Effect<StoredIntegration, NotFound>;
  readonly list: (
    command: IntegrationListCommand
  ) => Effect.Effect<IntegrationPage>;
}

class IntegrationStore extends Context.Service<
  IntegrationStore,
  IntegrationStoreApi
>()("design-studio/integration/IntegrationStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    IntegrationStore,
    IntegrationStore.of({
      get: Effect.fn("IntegrationStore.get")(function* run(id: string) {
        return yield* getSaved(id);
      }),
      list: Effect.fn("IntegrationStore.list")(function* run(
        command: IntegrationListCommand
      ) {
        return toIntegrationPage(yield* listSavedIntegrations(), command);
      }),
    })
  );
}

export { IntegrationStore };

export type { IntegrationStoreApi };
