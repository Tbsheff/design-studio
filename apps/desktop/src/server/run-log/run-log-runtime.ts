import type { Effect } from "effect";

import type {
  Direction,
  PermissionDecision,
  Project,
  QueuedMessage,
} from "@design-studio/actions/_core/contracts";
import type { RepoContextState } from "../../shared/repo-context.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";

interface ActiveRun {
  readonly answer?: (
    requestId: string,
    decision: PermissionDecision
  ) => boolean;
  readonly cancel: () => void;
  readonly setQueue?: (items: QueuedMessage[]) => boolean;
  readonly steer?: (text: string) => boolean;
}

interface StartRunCall {
  readonly body: object;
  readonly directionId: string;
  readonly projectId: string;
}

interface RunLogRuntime {
  readonly findRunProject: (runId: string) => Promise<string | null>;
  readonly loadContext: (
    project: Project,
    workTree: string
  ) => Promise<RepoContextState>;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly projects: { readonly get: (projectId: string) => Promise<Project> };
  readonly runner: {
    readonly get: (runId: string) => ActiveRun | undefined;
    readonly isRunning: (projectId: string, directionId: string) => boolean;
  };
  readonly runsDir: (projectId: string) => string;
  readonly startRun: (input: StartRunCall) => Promise<string>;
}

const slot = makeRuntimeSlot<RunLogRuntime>("Run log");

const bindRunLogRuntime = (runtime: RunLogRuntime): void => {
  slot.bind(runtime);
};

const readRunLogRuntime: Effect.Effect<RunLogRuntime> = slot.read;

export { bindRunLogRuntime, readRunLogRuntime };

export type { ActiveRun, RunLogRuntime, StartRunCall };
