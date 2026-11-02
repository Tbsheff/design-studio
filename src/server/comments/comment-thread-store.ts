import { Context, Effect, Layer } from "effect";

import type { CommentPrefill, DesignComment } from "../../shared/contracts.js";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "../store/comments.js";
import { NotFoundError } from "../store/errors.js";
import { attemptComments } from "./comment-core.js";
import type { CommentError, CommentRuntime } from "./comment-core.js";
import { buildPrefill, pickComments } from "./prefill.js";

interface CommentRef {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface ReplyRequest {
  readonly author: string | null;
  readonly commentId: string;
  readonly text: string;
}

interface CommentThreadStoreApi {
  readonly addReply: (
    ref: CommentRef,
    commentId: string,
    text: string,
    author: string | null
  ) => Effect.Effect<DesignComment, CommentError>;
  readonly create: (
    ref: CommentRef,
    input: CreateCommentInput
  ) => Effect.Effect<DesignComment, CommentError>;
  readonly prefill: (
    ref: CommentRef,
    ids: readonly string[]
  ) => Effect.Effect<CommentPrefill, CommentError>;
  readonly remove: (
    ref: CommentRef,
    commentId: string
  ) => Effect.Effect<void, CommentError>;
  readonly removeReply: (
    ref: CommentRef,
    commentId: string,
    replyId: string
  ) => Effect.Effect<DesignComment, CommentError>;
  readonly reorder: (
    ref: CommentRef,
    ids: readonly string[]
  ) => Effect.Effect<DesignComment[], CommentError>;
  readonly update: (
    ref: CommentRef,
    commentId: string,
    input: UpdateCommentInput
  ) => Effect.Effect<DesignComment, CommentError>;
}

const withTarget = async <Value>(
  runtime: CommentRuntime,
  ref: CommentRef,
  task: (projectId: string, directionId: string) => Promise<Value>
): Promise<Value> => {
  const { direction, project } = await runtime.loadTarget(
    ref.projectId,
    ref.directionId
  );

  return task(project.id, direction.id);
};

const checkAttachments = async (
  runtime: CommentRuntime,
  projectId: string,
  ids: readonly string[]
): Promise<void> => {
  const found = await Promise.all(
    ids.map((id) => runtime.hasAttachment(projectId, id))
  );

  const missingIndex = found.indexOf(false);

  if (missingIndex !== -1) {
    throw new NotFoundError(`attachment ${ids[missingIndex] ?? ""} not found`);
  }
};

const addCommentReply = (
  runtime: CommentRuntime,
  ref: CommentRef,
  reply: ReplyRequest
): Promise<DesignComment> =>
  withTarget(runtime, ref, (projectId, directionId) => {
    if (reply.author === null) {
      return runtime.files.addReply(
        projectId,
        directionId,
        reply.commentId,
        reply.text
      );
    }

    return runtime.files.addReply(
      projectId,
      directionId,
      reply.commentId,
      reply.text,
      reply.author
    );
  });

const createComment = async (
  runtime: CommentRuntime,
  ref: CommentRef,
  input: CreateCommentInput
): Promise<DesignComment> => {
  const { direction, project } = await runtime.loadTarget(
    ref.projectId,
    ref.directionId
  );

  await checkAttachments(runtime, project.id, input.attachmentIds ?? []);

  return runtime.files.create(project.id, direction.id, input);
};

const buildCommentPrefill = async (
  runtime: CommentRuntime,
  ref: CommentRef,
  ids: readonly string[]
): Promise<CommentPrefill> => {
  const { direction, project } = await runtime.loadTarget(
    ref.projectId,
    ref.directionId
  );

  const all = await runtime.files.list(project.id, direction.id);

  const chosen = pickComments(all, [...ids]);

  return buildPrefill(runtime.prefill, project, direction, chosen);
};

class CommentThreadStore extends Context.Service<
  CommentThreadStore,
  CommentThreadStoreApi
>()("design-studio/comments/CommentThreadStore") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CommentThreadStore,
    CommentThreadStore.of({
      addReply: Effect.fn("CommentThreadStore.addReply")(function* run(
        ref: CommentRef,
        commentId: string,
        text: string,
        author: string | null
      ) {
        return yield* attemptComments((runtime) =>
          addCommentReply(runtime, ref, { author, commentId, text })
        );
      }),
      create: Effect.fn("CommentThreadStore.create")(function* run(
        ref: CommentRef,
        input: CreateCommentInput
      ) {
        return yield* attemptComments((runtime) =>
          createComment(runtime, ref, input)
        );
      }),
      prefill: Effect.fn("CommentThreadStore.prefill")(function* run(
        ref: CommentRef,
        ids: readonly string[]
      ) {
        return yield* attemptComments((runtime) =>
          buildCommentPrefill(runtime, ref, ids)
        );
      }),
      remove: Effect.fn("CommentThreadStore.remove")(function* run(
        ref: CommentRef,
        commentId: string
      ) {
        return yield* attemptComments((runtime) =>
          withTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.remove(projectId, directionId, commentId)
          )
        );
      }),
      removeReply: Effect.fn("CommentThreadStore.removeReply")(function* run(
        ref: CommentRef,
        commentId: string,
        replyId: string
      ) {
        return yield* attemptComments((runtime) =>
          withTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.removeReply(
              projectId,
              directionId,
              commentId,
              replyId
            )
          )
        );
      }),
      reorder: Effect.fn("CommentThreadStore.reorder")(function* run(
        ref: CommentRef,
        ids: readonly string[]
      ) {
        return yield* attemptComments((runtime) =>
          withTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.reorder(projectId, directionId, [...ids])
          )
        );
      }),
      update: Effect.fn("CommentThreadStore.update")(function* run(
        ref: CommentRef,
        commentId: string,
        input: UpdateCommentInput
      ) {
        return yield* attemptComments((runtime) =>
          withTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.update(projectId, directionId, commentId, input)
          )
        );
      }),
    })
  );
}

export { CommentThreadStore };

export type { CommentRef, CommentThreadStoreApi };
