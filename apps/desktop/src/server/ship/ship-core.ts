import path from "node:path";

import { Effect } from "effect";

import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Project } from "@design-studio/actions/_core/contracts";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { assertSafeId } from "../platform/errors/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
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

const runtimes = makeRuntimeSlot<ShipRuntime>("Ship");

const bindShipRuntime = (dataDir: string, runtime: ShipRuntime): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toShipRuntime = (dataDir: string): ShipRuntime | null =>
  runtimes.peekAt(dataDir);

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

const runOnTarget = async <Value>(
  root: string,
  current: ShipRuntime,
  projectId: string,
  task: (target: ShipTarget) => Promise<Value>
): Promise<Value> => task(await loadTarget(root, current, projectId));

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

export type { ShipError, ShipRuntime, ShipTarget };
