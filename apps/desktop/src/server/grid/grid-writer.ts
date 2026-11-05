import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runGridSet, runGridSetItem } from "./grid-run.js";
import type {
  GridChange,
  SetGridCommand,
  SetGridItemCommand,
} from "./grid-run.js";

interface GridWriterApi {
  readonly set: (
    command: SetGridCommand
  ) => Effect.Effect<GridChange, KnownFailure>;
  readonly setItem: (
    command: SetGridItemCommand
  ) => Effect.Effect<GridChange, KnownFailure>;
}

class GridWriter extends Context.Service<GridWriter, GridWriterApi>()(
  "design-studio/grid/GridWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    GridWriter,
    GridWriter.of({
      set: Effect.fn("GridWriter.set")(function* run(command: SetGridCommand) {
        return yield* runGridSet(command);
      }),
      setItem: Effect.fn("GridWriter.setItem")(function* run(
        command: SetGridItemCommand
      ) {
        return yield* runGridSetItem(command);
      }),
    })
  );
}

export { GridWriter };

export type { GridWriterApi };
