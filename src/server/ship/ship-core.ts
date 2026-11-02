import path from "node:path";

import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { Project } from "../../shared/contracts.js";
import { loadConfig } from "../platform/config/index.js";
import { assertSafeId, ConflictError, NotFoundError } from "../store/errors.js";
import type { StudioProjectStore } from "../store/projects.js";

interface ShipActivityDraft {
  readonly directionId: string;
  readonly projectId: string;
  readonly summary: string;
}

interface ShipActivity {
  readonly record: (
    tool: string,
    client: string,
    draft: ShipActivityDraft
  ) => Promise<object>;
}

interface ShipRunCheck {
  readonly isRunning: (projectId: string, directionId: string) => boolean;
}

interface ShipRuntime {
  readonly activity: ShipActivity;
  readonly projects: StudioProjectStore;
  readonly runner: ShipRunCheck;
}

interface ShipTarget {
  readonly dataDir: string;
  readonly project: Project;
  readonly projectDir: string;
  readonly runtime: ShipRuntime;
}

type ShipError = BadRequest | Conflict | NotFound;

const NOT_READY =
  "Ship is not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, ShipRuntime>();

const bindShipRuntime = (dataDir: string, runtime: ShipRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toShipRuntime = (dataDir: string): ShipRuntime | null =>
  runtimes.get(dataDir) ?? null;

const toProjectDir = (dataDir: string, projectId: string): string =>
  path.join(dataDir, "projects", assertSafeId(projectId, "projectId"));

const loadTarget = async (
  root: string,
  current: ShipRuntime,
  projectId: string
): Promise<ShipTarget> => {
  const found = await current.projects.get(projectId);

  return {
    dataDir: root,
    project: found,
    projectDir: toProjectDir(root, found.id),
    runtime: current,
  };
};

const toShipError = (error: Cause.UnknownError): ShipError => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof ConflictError) {
    return new Conflict({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attemptShip = <Value>(
  projectId: string,
  task: (target: ShipTarget) => Promise<Value>
): Effect.Effect<Value, ShipError> =>
  Effect.gen(function* withTarget() {
    const { dataDir } = loadConfig();
    const runtime = toShipRuntime(dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(async () =>
      task(await loadTarget(dataDir, runtime, projectId))
    ).pipe(Effect.mapError((failure) => toShipError(failure)));
  });

export { attemptShip, bindShipRuntime, toShipRuntime };

export type { ShipError, ShipRuntime, ShipTarget };
