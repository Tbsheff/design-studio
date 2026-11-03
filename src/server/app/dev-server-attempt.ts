import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { requireBound } from "../platform/runtime-slot/index.js";
import { devServerRuntimeOf } from "./dev-server-runtime.js";
import type { DevServerRuntime } from "./dev-server-runtime.js";

const runOnServer = <Value>(
  task: (runtime: DevServerRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("App server", devServerRuntimeOf());

    return yield* attemptKnown(() => task(runtime));
  });

export { runOnServer };
