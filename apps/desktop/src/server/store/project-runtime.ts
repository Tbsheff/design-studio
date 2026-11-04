import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";
import type { StudioProjectStore } from "./project-types.js";

const slot = makeRuntimeSlot<StudioProjectStore>("Project store");

const bindProjectRuntime = (
  dataDir: string,
  store: StudioProjectStore
): void => {
  slot.bindAt(dataDir, store);
};

const readProjectRuntime = slot.read;

const attemptProject = <Value>(
  task: (store: StudioProjectStore) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withStore() {
    const store = yield* slot.read;

    return yield* attemptKnown(() => task(store));
  });

export { attemptProject, bindProjectRuntime, readProjectRuntime };
