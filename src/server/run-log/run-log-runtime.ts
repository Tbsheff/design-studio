import { Effect } from "effect";

import type { Direction, Project } from "../../shared/contracts.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";

interface Decision {
  allow: boolean;
  always?: string;
  note?: string;
}

interface ActiveRun {
  readonly answer?: (requestId: string, decision: Decision) => boolean;
  readonly cancel: () => void;
  readonly setQueue?: (items: { id: string; text: string }[]) => boolean;
  readonly steer?: (text: string) => boolean;
}

interface RunLogRuntime {
  readonly findRunProject: (runId: string) => Promise<string | null>;
  readonly loadContext: (project: Project, workTree: string) => Promise<object>;
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

interface StartRunCall {
  readonly body: object;
  readonly directionId: string;
  readonly projectId: string;
}

const slot = makeRuntimeSlot<RunLogRuntime>("Run log");

const bindRunLogRuntime = (runtime: RunLogRuntime): void => {
  slot.bind(runtime);
};

const attemptRunLog = <Value>(
  task: (runtime: RunLogRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* slot.read;

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptRunLog, bindRunLogRuntime };

export type { ActiveRun, Decision, RunLogRuntime, StartRunCall };
