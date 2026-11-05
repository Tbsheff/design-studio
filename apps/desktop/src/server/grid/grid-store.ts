import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { GridInfo } from "./deps.js";
import { runGridGet } from "./grid-run.js";
import type { GetGridCommand } from "./grid-run.js";

interface GridStoreApi {
  readonly get: (
    command: GetGridCommand
  ) => Effect.Effect<GridInfo, KnownFailure>;
}

class GridStore extends Context.Service<GridStore, GridStoreApi>()(
  "design-studio/grid/GridStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    GridStore,
    GridStore.of({
      get: Effect.fn("GridStore.get")(function* run(command: GetGridCommand) {
        return yield* runGridGet(command);
      }),
    })
  );
}

export { GridStore };

export type { GridStoreApi };
