import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { requireBound } from "../platform/runtime-slot/index.js";
import { toShareParts } from "./share-core.js";
import type { ShareParts } from "./share-links.js";

type ShareError = KnownFailure;

const attemptShare = <Value>(
  task: (parts: ShareParts) => Promise<Value>
): Effect.Effect<Value, ShareError> =>
  Effect.gen(function* withParts() {
    const parts = yield* requireBound(
      "Share",
      toShareParts(loadConfig().dataDir)
    );

    return yield* attemptKnown(() => task(parts));
  });

export { attemptShare };

export type { ShareError };
