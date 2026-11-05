import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runComponentVariantPreview } from "./component-variant-run.js";
import type {
  ComponentVariantPreviewed,
  GetComponentVariantCommand,
} from "./component-variant-run.js";

interface ComponentVariantStoreApi {
  readonly get: (
    command: GetComponentVariantCommand
  ) => Effect.Effect<ComponentVariantPreviewed, KnownFailure>;
}

class ComponentVariantStore extends Context.Service<
  ComponentVariantStore,
  ComponentVariantStoreApi
>()("design-studio/components/ComponentVariantStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ComponentVariantStore,
    ComponentVariantStore.of({
      get: Effect.fn("ComponentVariantStore.get")(function* run(
        command: GetComponentVariantCommand
      ) {
        return yield* runComponentVariantPreview(command);
      }),
    })
  );
}

export { ComponentVariantStore };

export type { ComponentVariantStoreApi };
