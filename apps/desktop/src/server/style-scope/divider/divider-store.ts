import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { DividerInfo } from "./divider-edit.js";
import { runDividerGet } from "./divider-run.js";
import type { GetDividerCommand } from "./divider-run.js";

interface DividerStoreApi {
  readonly get: (
    command: GetDividerCommand
  ) => Effect.Effect<DividerInfo, KnownFailure>;
}

class DividerStore extends Context.Service<DividerStore, DividerStoreApi>()(
  "design-studio/style-scope/DividerStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    DividerStore,
    DividerStore.of({
      get: Effect.fn("DividerStore.get")(function* run(
        command: GetDividerCommand
      ) {
        return yield* runDividerGet(command);
      }),
    })
  );
}

export { DividerStore };

export type { DividerStoreApi };
