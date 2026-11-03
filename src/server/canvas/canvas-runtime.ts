import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import type { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { runtimeOf } from "./links/link-runtime.js";
import type { LinkRuntime } from "./links/link-runtime.js";

type CanvasFailure = BadRequest | Conflict | NotFound;

const NOT_READY =
  "The canvas is not ready in this Design Studio process. Restart Design Studio.";

const attemptCanvas = <Value>(
  task: (runtime: LinkRuntime) => Promise<Value>
): Effect.Effect<Value, CanvasFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimeOf();

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptCanvas };

export type { CanvasFailure };
