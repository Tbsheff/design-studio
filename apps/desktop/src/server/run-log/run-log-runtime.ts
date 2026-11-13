import type {
  Direction,
  PermissionDecision,
  Project,
  QueuedMessage,
  RunLevel,
  VariationStartResult,
} from "@design-studio/contracts";
import type { PortStartResult } from "@design-studio/contracts/port";
import type { Effect } from "effect";

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

interface PortRunCall {
  readonly directionId: string | null;
  readonly flow: boolean;
  readonly path: string | null;
  readonly paths: readonly string[] | null;
  readonly projectId: string;
  readonly route: string;
  readonly targetProjectId: string;
}

interface VariationBriefCall {
  readonly brief: string;
  readonly title: string;
}

interface VariationStartCall {
  readonly attachmentIds: readonly string[];
  readonly briefs: readonly VariationBriefCall[] | null;
  readonly count: number;
  readonly fromDirectionId: string | null;
  readonly level: RunLevel | null;
  readonly projectId: string;
  readonly prompt: string;
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
  readonly startPort: (call: PortRunCall) => Promise<PortStartResult>;
  readonly startRun: (input: StartRunCall) => Promise<string>;
  readonly startVariations: (
    input: VariationStartCall
  ) => Promise<VariationStartResult>;
}

const slot = makeRuntimeSlot<RunLogRuntime>("Run log");

const bindRunLogRuntime = (runtime: RunLogRuntime): void => {
  slot.bind(runtime);
};

const readRunLogRuntime: Effect.Effect<RunLogRuntime> = slot.read;

export { bindRunLogRuntime, readRunLogRuntime };

export type {
  ActiveRun,
  PortRunCall,
  RunLogRuntime,
  StartRunCall,
  VariationStartCall,
};
