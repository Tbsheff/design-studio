import { Context, Effect, Layer } from "effect";

import { boundSaveLanes } from "./save-lanes.js";

interface SaveQueueApi {
  readonly failures: (projectId: string) => Effect.Effect<readonly string[]>;
  readonly isPending: (versionId: string) => Effect.Effect<boolean>;
  readonly savedId: (versionId: string) => Effect.Effect<string>;
  readonly settled: (projectId: string | null) => Effect.Effect<void>;
}

const lanesOrDie = Effect.suspend(() => {
  const lanes = boundSaveLanes();

  if (lanes === null) {
    return Effect.die("The save queue is not open.");
  }

  return Effect.succeed(lanes);
});

class SaveQueue extends Context.Service<SaveQueue, SaveQueueApi>()(
  "design-studio/events/SaveQueue"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    SaveQueue,
    SaveQueue.of({
      failures: Effect.fn("SaveQueue.failures")(function* run(
        projectId: string
      ) {
        const lanes = yield* lanesOrDie;

        return lanes.failures(projectId);
      }),
      isPending: Effect.fn("SaveQueue.isPending")(function* run(
        versionId: string
      ) {
        const lanes = yield* lanesOrDie;

        return lanes.isPending({ id: versionId });
      }),
      savedId: Effect.fn("SaveQueue.savedId")(function* run(versionId: string) {
        const lanes = yield* lanesOrDie;

        return lanes.savedId(versionId);
      }),
      settled: Effect.fn("SaveQueue.settled")(function* run(
        projectId: string | null
      ) {
        const lanes = yield* lanesOrDie;

        yield* Effect.promise(() => lanes.settled(projectId));
      }),
    })
  );
}

export { SaveQueue };

export type { SaveQueueApi };
