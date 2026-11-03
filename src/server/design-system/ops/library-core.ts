import { Effect } from "effect";

import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import type { Conflict } from "../../../shared/actions/_core/errors/conflict.js";
import type { NotFound } from "../../../shared/actions/_core/errors/not-found.js";
import { CheckFailed } from "../../../shared/actions/packs/errors/check-failed.js";
import { PackExists } from "../../../shared/actions/packs/errors/pack-exists.js";
import type {
  Direction,
  PackSummary,
  Project,
} from "../../../shared/contracts.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { loadConfig } from "../../platform/config/index.js";
import type { StudioProjectStore } from "../../store/projects.js";
import type { AgentRunner, VersionStore } from "../../types.js";
import type { LiveDrafts } from "../draft-live.js";
import type { Fetcher } from "../extract/url.js";
import type { PackLibrary } from "../library.js";
import { PackExistsError } from "../pack-import.js";
import type { LoadedPack } from "../packs.js";
import { SaveCheckError } from "../project-pack.js";
import type { ProjectPackDeps } from "../project-pack.js";

interface PackDraftDeps {
  readonly allowLoopback: boolean;
  readonly fetcher: Fetcher;
  readonly finishCreate: (
    project: Project,
    pack: LoadedPack
  ) => Promise<Project>;
  readonly projectsFolder: () => Promise<string>;
  readonly versions: VersionStore;
  readonly watch: (project: Project, direction: Direction) => void;
}

interface PackEditDeps {
  readonly editDeps: ProjectPackDeps;
  readonly onDeleted: (packId: string) => Promise<void>;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

interface PackRuntime {
  readonly drafts: PackDraftDeps | null;
  readonly library: PackLibrary;
  readonly live: LiveDrafts | null;
  readonly projects: StudioProjectStore;
  readonly runner: AgentRunner;
}

interface PackWriteRuntime extends PackRuntime {
  readonly dataDir: string;
  readonly drafts: PackDraftDeps;
  readonly edits: PackEditDeps;
}

type PackError = BadRequest | Conflict | NotFound;

type PackWriteError =
  | BadRequest
  | CheckFailed
  | Conflict
  | NotFound
  | PackExists;

const NOT_READY =
  "Design systems are not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, PackRuntime>();

const edits = new Map<string, PackEditDeps>();

const bindPackRuntime = (dataDir: string, runtime: PackRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const bindPackEdits = (dataDir: string, deps: PackEditDeps): void => {
  edits.set(dataDir, deps);
};

const toPackRuntime = (dataDir: string): PackRuntime | null =>
  runtimes.get(dataDir) ?? null;

const toWriteRuntime = (dataDir: string): PackWriteRuntime | null => {
  const runtime = runtimes.get(dataDir) ?? null;
  const edit = edits.get(dataDir) ?? null;

  if (runtime === null || edit === null || runtime.drafts === null) {
    return null;
  }

  return { ...runtime, dataDir, drafts: runtime.drafts, edits: edit };
};

const toExisting = (existing: PackSummary): PackSummary => existing;

const toWriteFailure = (cause: unknown): CheckFailed | PackExists | null => {
  if (cause instanceof PackExistsError) {
    return new PackExists({
      code: "pack_exists",
      data: { existing: toExisting(cause.existing) },
      message: cause.message,
    });
  }

  if (cause instanceof SaveCheckError) {
    return new CheckFailed({
      code: "check_failed",
      data: { problems: cause.problems },
      message: cause.message,
    });
  }

  return null;
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

    return yield* attemptKnown(() => task(runtime));
  });

const attemptPackWrites = <Value>(
  task: (runtime: PackWriteRuntime) => Promise<Value>
): Effect.Effect<Value, PackWriteError> =>
  Effect.gen(function* withWriteRuntime() {
    const { dataDir } = loadConfig();
    const runtime = toWriteRuntime(dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime), toWriteFailure);
  });

export {
  attemptPackWrites,
  attemptPacks,
  bindPackEdits,
  bindPackRuntime,
  toPackRuntime,
};

export type {
  PackDraftDeps,
  PackEditDeps,
  PackError,
  PackRuntime,
  PackWriteError,
  PackWriteRuntime,
};
