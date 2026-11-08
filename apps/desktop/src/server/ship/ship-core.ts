import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { runOnTarget } from "../git/ship-target.js";
import type { ShipRuntime, ShipTarget } from "../git/ship-target.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";

type ShipError = BadRequest | Conflict | NotFound;

const runtimes = makeRuntimeSlot<ShipRuntime>("Ship");

const bindShipRuntime = (dataDir: string, runtime: ShipRuntime): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toShipRuntime = (dataDir: string): ShipRuntime | null =>
  runtimes.peekAt(dataDir);

const attemptShip = <Value>(
  projectId: string,
  task: (target: ShipTarget) => Promise<Value>
): Effect.Effect<Value, ShipError> =>
  Effect.gen(function* withTarget() {
    const { dataDir } = loadConfig();
    const runtime = yield* requireBound("Ship", toShipRuntime(dataDir));

    return yield* attemptKnown(() =>
      runOnTarget(dataDir, runtime, projectId, task)
    );
  });

export { attemptShip, bindShipRuntime, toShipRuntime };

export type { ShipError };
