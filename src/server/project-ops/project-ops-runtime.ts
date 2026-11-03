import { Effect } from "effect";

import type {
  Direction,
  Project,
  ProjectSettings,
  RunLevel,
  RunRequest,
  Version,
  VersionMeta,
} from "../../shared/contracts.js";
import type { AttachResponse } from "../app/index.js";
import type { LoadedPack, PackRegistry } from "../design-system/index.js";
import type { EventBus } from "../events/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";
import type {
  CommandRuleStore,
  DefaultFolderStore,
  StudioProjectStore,
} from "../store/index.js";

type CommitFileArgs = [
  project: Project,
  direction: Direction,
  relativePath: string | string[],
  title: string,
  meta: VersionMeta,
];

interface ProjectOpsParsers {
  readonly level: (raw: string | undefined) => RunLevel | undefined;
  readonly packOf: (
    registry: PackRegistry,
    raw: string | null | undefined
  ) => Promise<LoadedPack | null>;
  readonly projectFile: (dir: string, requested: string) => Promise<string>;
  readonly settings: <Fields extends object>(
    raw: Fields | undefined
  ) => Partial<ProjectSettings> | undefined;
  readonly startRun: (raw: boolean | undefined) => boolean;
}

interface ProjectOpsRuntime {
  readonly addParentFolder: (
    parentPath: string | undefined,
    created: Project
  ) => Promise<void>;
  readonly attach: (project: Project) => Promise<AttachResponse>;
  readonly bus: EventBus;
  readonly commandRules: CommandRuleStore;
  readonly commitInit: (project: Project) => Promise<Project>;
  readonly config: { readonly fetchAllowLoopback?: boolean };
  readonly defaultFolder: DefaultFolderStore;
  readonly directionLock: <Result>(
    key: string,
    task: () => Promise<Result>
  ) => Promise<Result>;
  readonly emitStatus: (
    project: Project,
    direction: Direction
  ) => Promise<void>;
  readonly packs: PackRegistry;
  readonly parsers: ProjectOpsParsers;
  readonly prepareCreated: (
    created: Project,
    pack: LoadedPack | null,
    designMd: string | undefined
  ) => Promise<Project>;
  readonly preview: {
    readonly release: (project: Project, direction: Direction) => Promise<void>;
  };
  readonly projects: StudioProjectStore;
  readonly recordVersion: (
    project: Project,
    direction: Direction,
    version: Version
  ) => Promise<Direction>;
  readonly runner: {
    readonly isRunning: (projectId: string, directionId: string) => boolean;
  };
  readonly startRun: (
    project: Project,
    direction: Direction,
    input: RunRequest
  ) => Promise<string>;
  readonly versions: {
    readonly commitFile: (...args: CommitFileArgs) => Promise<Version | null>;
    readonly ensureRepo: (project: Project) => Promise<void>;
  };
  readonly watchDirection: (project: Project, direction: Direction) => void;
}

const slot = makeRuntimeSlot<ProjectOpsRuntime>("Project ops");

const bindProjectOpsRuntime = (runtime: ProjectOpsRuntime): void => {
  slot.bind(runtime);
};

const projectOpsRuntimeOf = (): ProjectOpsRuntime | null => slot.peek();

const attemptProjectOps = <Value>(
  task: (runtime: ProjectOpsRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* slot.read;

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptProjectOps, bindProjectOpsRuntime, projectOpsRuntimeOf };

export type { ProjectOpsParsers, ProjectOpsRuntime };
