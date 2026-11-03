import { commentPrompt, isSendable } from "../../shared/comments.js";
import type {
  DesignComment,
  Direction,
  Project,
  RunLevel,
  RunRequest,
} from "../../shared/contracts.js";
import { ConflictError, NotFoundError } from "../store/errors.js";
import type { CommentRuntime } from "./comment-core.js";
import { toRunPayload } from "./run-payload.js";
import type { SelectionContexts } from "./run-payload.js";

interface StartRequest {
  readonly contexts: SelectionContexts;
  readonly directionId: string;
  readonly ids: readonly string[] | null;
  readonly level: RunLevel | null;
  readonly projectId: string;
}

type StartOutcome =
  | { readonly kind: "busy" }
  | { readonly kind: "empty" }
  | {
      readonly comments: DesignComment[];
      readonly kind: "started";
      readonly runId: string;
    };

const toChosen = (
  all: readonly DesignComment[],
  ids: readonly string[] | null
): DesignComment[] => {
  if (ids === null) {
    return all.filter((comment) => comment.status === "queued");
  }

  return ids.map((id) => {
    const comment = all.find((candidate) => candidate.id === id);

    if (!comment) {
      throw new NotFoundError(`comment ${id} not found`);
    }

    if (!isSendable(comment.status)) {
      throw new ConflictError(`bad_transition: ${comment.status} -> sent`);
    }

    return comment;
  });
};

const toRunRequest = (
  chosen: readonly DesignComment[],
  request: StartRequest
): RunRequest => {
  const run: RunRequest = {
    mode: "edit",
    prompt: commentPrompt([...chosen]),
    ...toRunPayload(chosen, request.contexts),
  };

  if (request.level !== null) {
    run.level = request.level;
  }

  return run;
};

const startInDirection = async (
  runtime: CommentRuntime,
  request: StartRequest,
  target: { readonly direction: Direction; readonly project: Project }
): Promise<StartOutcome> => {
  const { direction, project } = target;

  const { files, runs } = runtime;

  const chosen = toChosen(
    await files.list(project.id, direction.id),
    request.ids
  );

  if (chosen.length === 0) {
    return { kind: "empty" };
  }

  const ids = chosen.map((comment) => comment.id);

  if (runs.runner.isRunning(project.id, direction.id)) {
    await files.requeue(project.id, direction.id, ids);

    return { kind: "busy" };
  }

  const runId = await runs.startRun(
    project,
    direction,
    toRunRequest(chosen, request)
  );

  const handle = runs.runner.get(runId);

  const sent = files.markSent(project.id, direction.id, ids, runId);

  if (handle) {
    runs.watcher.watch(project.id, direction.id, handle);
  }

  return { comments: await sent, kind: "started", runId };
};

const startCommentRun = (
  runtime: CommentRuntime,
  request: StartRequest
): Promise<StartOutcome> =>
  runtime.runs.withDirection(
    request.projectId,
    request.directionId,
    (project, direction) =>
      startInDirection(runtime, request, { direction, project })
  );

export { startCommentRun };

export type { StartOutcome, StartRequest };
