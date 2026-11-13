import { Context, Effect, Layer } from "effect";

import { attemptCanvas } from "../canvas-runtime.js";
import type { CanvasFailure } from "../canvas-runtime.js";
import type { CheckBoard } from "./engine/to-state-likeness.js";
import { getCheckBoard, toDiffPct } from "./state-check-ops.js";
import type { StateCheckQuery } from "./state-check-ops.js";

interface StateCheckStoreApi {
  readonly board: (
    query: StateCheckQuery
  ) => Effect.Effect<CheckBoard, CanvasFailure>;
  readonly diffPct: (base: string, other: string) => Effect.Effect<number>;
}

class StateCheckStore extends Context.Service<
  StateCheckStore,
  StateCheckStoreApi
>()("design-studio/canvas/StateCheckStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    StateCheckStore,
    StateCheckStore.of({
      board: Effect.fn("StateCheckStore.board")(function* run(
        query: StateCheckQuery
      ) {
        return yield* attemptCanvas((runtime) => getCheckBoard(runtime, query));
      }),
      diffPct: Effect.fn("StateCheckStore.diffPct")(function* run(
        base: string,
        other: string
      ) {
        return yield* Effect.sync(() => toDiffPct(base, other));
      }),
    })
  );
}

export { StateCheckStore };

export type { StateCheckStoreApi };
