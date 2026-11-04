import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { CheckFailed } from "@design-studio/actions/pack/errors/check-failed";
import { PackExists } from "@design-studio/actions/pack/errors/pack-exists";
import type { Direction, PackSummary, Project } from "@design-studio/contracts";
import { Effect } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import { loadConfig } from "../../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../../platform/runtime-slot/index.js";
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

const PACK_LABEL = "Design system";

const runtimes = makeRuntimeSlot<PackRuntime>(PACK_LABEL);

const edits = makeRuntimeSlot<PackEditDeps>(PACK_LABEL);

const bindPackRuntime = (dataDir: string, runtime: PackRuntime): void => {
  runtimes.bindAt(dataDir, runtime);
};

const bindPackEdits = (dataDir: string, deps: PackEditDeps): void => {
  edits.bindAt(dataDir, deps);
};

const toPackRuntime = (dataDir: string): PackRuntime | null =>
  runtimes.peekAt(dataDir);

const toWriteRuntime = (dataDir: string): PackWriteRuntime | null => {
  const runtime = runtimes.peekAt(dataDir);
  const edit = edits.peekAt(dataDir);

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
    const runtime = yield* requireBound(PACK_LABEL, toPackRuntime(dataDir));

    return yield* attemptKnown(() => task(runtime));
  });

const attemptPackWrites = <Value>(
  task: (runtime: PackWriteRuntime) => Promise<Value>
): Effect.Effect<Value, PackWriteError> =>
  Effect.gen(function* withWriteRuntime() {
    const { dataDir } = loadConfig();
    const runtime = yield* requireBound(PACK_LABEL, toWriteRuntime(dataDir));

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
