import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import type { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { Direction, Project, RunRequest } from "../../shared/contracts.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import type { CommentStore as CommentFiles } from "../store/comments.js";
import type { AgentRunner } from "../types.js";
import type { PrefillDeps } from "./prefill.js";
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
  readonly runs: CommentRunDeps;
}

type CommentError = BadRequest | Conflict | NotFound;

const NOT_READY =
  "Comments are not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, CommentRuntime>();

const bindCommentRuntime = (dataDir: string, runtime: CommentRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toCommentRuntime = (dataDir: string): CommentRuntime | null =>
  runtimes.get(dataDir) ?? null;

const attemptComments = <Value>(
  task: (runtime: CommentRuntime) => Promise<Value>
): Effect.Effect<Value, CommentError> =>
  Effect.gen(function* withRuntime() {
    const runtime = toCommentRuntime(loadConfig().dataDir);

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptComments, bindCommentRuntime, toCommentRuntime };

export type { CommentError, CommentRunDeps, CommentRuntime, CommentTarget };
