import { Context, Effect, Layer } from "effect";

import type { CommentPrefill, DesignComment } from "@design-studio/actions/_core/contracts";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "../store/comments.js";
import { attemptComments } from "./comment-core.js";
import type { CommentError } from "./comment-core.js";
import { insertCommentAnchor } from "./comment-insert.js";
import type { InsertRequest, InsertedComment } from "./comment-insert.js";
import {
  createCommentThread,
  createCommentPrefill,
  createCommentReply,
  runOnTarget,
} from "./comment-thread-ops.js";
import type { CommentRef } from "./comment-thread-ops.js";

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
  readonly insert: (
    request: InsertRequest
  ) => Effect.Effect<InsertedComment, CommentError>;
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
  readonly resolve: (
    ref: CommentRef,
    commentId: string
  ) => Effect.Effect<DesignComment, CommentError>;
  readonly update: (
    ref: CommentRef,
    commentId: string,
    input: UpdateCommentInput
  ) => Effect.Effect<DesignComment, CommentError>;
}

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
          createCommentReply(runtime, ref, { author, commentId, text })
        );
      }),
      create: Effect.fn("CommentThreadStore.create")(function* run(
        ref: CommentRef,
        input: CreateCommentInput
      ) {
        return yield* attemptComments((runtime) =>
          createCommentThread(runtime, ref, input)
        );
      }),
      insert: Effect.fn("CommentThreadStore.insert")(function* run(
        request: InsertRequest
      ) {
        return yield* attemptComments((runtime) =>
          insertCommentAnchor(runtime, request)
        );
      }),
      prefill: Effect.fn("CommentThreadStore.prefill")(function* run(
        ref: CommentRef,
        ids: readonly string[]
      ) {
        return yield* attemptComments((runtime) =>
          createCommentPrefill(runtime, ref, ids)
        );
      }),
      remove: Effect.fn("CommentThreadStore.remove")(function* run(
        ref: CommentRef,
        commentId: string
      ) {
        return yield* attemptComments((runtime) =>
          runOnTarget(runtime, ref, (projectId, directionId) =>
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
          runOnTarget(runtime, ref, (projectId, directionId) =>
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
          runOnTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.reorder(projectId, directionId, [...ids])
          )
        );
      }),
      resolve: Effect.fn("CommentThreadStore.resolve")(function* run(
        ref: CommentRef,
        commentId: string
      ) {
        return yield* attemptComments((runtime) =>
          runOnTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.update(projectId, directionId, commentId, {
              status: "resolved",
            })
          )
        );
      }),
      update: Effect.fn("CommentThreadStore.update")(function* run(
        ref: CommentRef,
        commentId: string,
        input: UpdateCommentInput
      ) {
        return yield* attemptComments((runtime) =>
          runOnTarget(runtime, ref, (projectId, directionId) =>
            runtime.files.update(projectId, directionId, commentId, input)
          )
        );
      }),
    })
  );
}

export { CommentThreadStore };

export type { CommentThreadStoreApi };

export type { CommentRef } from "./comment-thread-ops.js";
