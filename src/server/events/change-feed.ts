import { Context, Effect, Layer } from "effect";

import {
  emitSourceChange,
  noteTreeWrite,
  onSourceChange,
  treeChangesSince,
  treeStamp,
} from "./source-change.js";
import type { Listener, SourceChange } from "./source-change.js";

interface ChangeFeedApi {
  readonly emit: (change: SourceChange) => Effect.Effect<void>;
  readonly noteWrite: (
    workTree: string,
    relatives: readonly string[],
    complete: boolean
  ) => Effect.Effect<void>;
  readonly since: (
    root: string,
    stamp: number
  ) => Effect.Effect<readonly string[] | null>;
  readonly stamp: (root: string) => Effect.Effect<number>;
  readonly subscribe: (listener: Listener) => Effect.Effect<() => void>;
}

class ChangeFeed extends Context.Service<ChangeFeed, ChangeFeedApi>()(
  "design-studio/events/ChangeFeed"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ChangeFeed,
    ChangeFeed.of({
      emit: Effect.fn("ChangeFeed.emit")(function* run(change: SourceChange) {
        yield* Effect.sync(() => emitSourceChange(change));
      }),
      noteWrite: Effect.fn("ChangeFeed.noteWrite")(function* run(
        workTree: string,
        relatives: readonly string[],
        complete: boolean
      ) {
        yield* Effect.sync(() =>
          noteTreeWrite(workTree, [...relatives], complete)
        );
      }),
      since: Effect.fn("ChangeFeed.since")(function* run(
        root: string,
        stamp: number
      ) {
        return yield* Effect.sync(() => treeChangesSince(root, stamp));
      }),
      stamp: Effect.fn("ChangeFeed.stamp")(function* run(root: string) {
        return yield* Effect.sync(() => treeStamp(root));
      }),
      subscribe: Effect.fn("ChangeFeed.subscribe")(function* run(
        listener: Listener
      ) {
        return yield* Effect.sync(() => onSourceChange(listener));
      }),
    })
  );
}

export { ChangeFeed };

export type { ChangeFeedApi };
