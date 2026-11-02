import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../../shared/actions/_core/errors/not-found.js";
import { loadConfig } from "../../platform/config/index.js";
import { NotFoundError } from "../../store/errors.js";
import type { StudioProjectStore } from "../../store/projects.js";
import type { AgentRunner } from "../../types.js";
import type { LiveDrafts } from "../draft-live.js";
import type { PackLibrary } from "../library.js";

interface PackRuntime {
  readonly library: PackLibrary;
  readonly live: LiveDrafts | null;
  readonly projects: StudioProjectStore;
  readonly runner: AgentRunner;
}

type PackError = BadRequest | NotFound;

const NOT_READY =
  "Design systems are not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, PackRuntime>();

const bindPackRuntime = (dataDir: string, runtime: PackRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toPackRuntime = (dataDir: string): PackRuntime | null =>
  runtimes.get(dataDir) ?? null;

const toPackError = (error: Cause.UnknownError): PackError => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attemptPacks = <Value>(
  task: (runtime: PackRuntime) => Promise<Value>
): Effect.Effect<Value, PackError> =>
  Effect.gen(function* withRuntime() {
    const { dataDir } = loadConfig();
    const runtime = toPackRuntime(dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toPackError(failure))
    );
  });

export { attemptPacks, bindPackRuntime, toPackRuntime };

export type { PackError, PackRuntime };
