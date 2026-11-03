import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type {
  Direction,
  Project,
  VersionThumbs,
} from "../../shared/contracts.js";
import type { EditHistory } from "../direct-edit/history.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import type { VersionStore } from "../types.js";
import type { StudioProjectStore } from "./projects.js";
import type { VersionNames } from "./version-names.js";

interface VersionReadRuntime {
  readonly history: EditHistory;
  readonly names: VersionNames;
  readonly projects: Pick<StudioProjectStore, "get" | "mainDirection">;
  readonly thumbs: (
    project: Project,
    from: string,
    to: string
  ) => Promise<VersionThumbs>;
  readonly versions: VersionStore;
}

interface VersionTarget {
  readonly direction: Direction;
  readonly project: Project;
}

type VersionReadError = KnownFailure;

const NOT_READY =
  "Version reads are not ready in this Design Studio process. Restart Design Studio.";

const REQUIRED_KEYS = [
  "history",
  "names",
  "projects",
  "thumbs",
  "versions",
] as const;

const runtimes = new Map<string, Partial<VersionReadRuntime>>();

const bindVersionReadRuntime = (part: Partial<VersionReadRuntime>): void => {
  const { dataDir } = loadConfig();
  runtimes.set(dataDir, { ...runtimes.get(dataDir), ...part });
};

const isReady = (
  runtime: Partial<VersionReadRuntime> | null
): runtime is VersionReadRuntime =>
  runtime !== null && REQUIRED_KEYS.every((key) => key in runtime);

const attemptVersionRead = <Value>(
  task: (runtime: VersionReadRuntime) => Promise<Value>
): Effect.Effect<Value, VersionReadError> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (!isReady(runtime)) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptVersionRead, bindVersionReadRuntime };

export type { VersionReadError, VersionReadRuntime, VersionTarget };
