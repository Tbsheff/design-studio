import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Direction, Project, RunRequest } from "@design-studio/contracts";
import { Effect } from "effect";

import type { AgentRunner } from "../../shared/server-ports.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
import type { CommentStore as CommentFiles } from "../store/comments.js";
import type { PrefillDeps } from "./prefill.js";
import type { ReferenceDeps } from "./reference-compare.js";
import type { RunWatcher } from "./run-watch.js";

interface CommentTarget {
  readonly direction: Direction;
  readonly project: Project;
}

interface CommentRunDeps {
  readonly runner: AgentRunner;
  readonly startRun: (
    project: Project,
    direction: Direction,
    request: RunRequest
  ) => Promise<string>;
  readonly watcher: RunWatcher;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

interface CommentRuntime {
  readonly files: CommentFiles;
  readonly hasAttachment: (
    projectId: string,
    attachmentId: string
  ) => Promise<boolean>;
  readonly loadTarget: (
    projectId: string,
    directionId: string | null
  ) => Promise<CommentTarget>;
  readonly prefill: PrefillDeps;
  readonly projectDir: (projectId: string) => string;
  readonly reference: ReferenceDeps;
  readonly runs: CommentRunDeps;
}

type CommentError = BadRequest | Conflict | NotFound;

const runtimes = makeRuntimeSlot<CommentRuntime>("Comments");

const bindCommentRuntime = (dataDir: string, runtime: CommentRuntime): void => {
  runtimes.bindAt(dataDir, runtime);
};

const toCommentRuntime = (dataDir: string): CommentRuntime | null =>
  runtimes.peekAt(dataDir);

const attemptComments = <Value>(
  task: (runtime: CommentRuntime) => Promise<Value>
): Effect.Effect<Value, CommentError> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound(
      "Comments",
      toCommentRuntime(loadConfig().dataDir)
    );

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptComments, bindCommentRuntime, toCommentRuntime };

export type { CommentError, CommentRunDeps, CommentRuntime, CommentTarget };
