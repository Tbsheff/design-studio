import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { toShareParts } from "./share-core.js";
import type { ShareParts } from "./share-links.js";

type ShareError = KnownFailure;

const NOT_READY =
  "Share links are not ready in this Design Studio process. Restart Design Studio.";

const attemptShare = <Value>(
  task: (parts: ShareParts) => Promise<Value>
): Effect.Effect<Value, ShareError> =>
  Effect.gen(function* withParts() {
    const parts = toShareParts(loadConfig().dataDir);

    if (parts === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(parts));
  });

export { attemptShare };

export type { ShareError };
