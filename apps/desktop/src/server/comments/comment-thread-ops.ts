import type { CommentPrefill, DesignComment } from "@design-studio/contracts";

import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import type { CreateCommentInput } from "../store/comments.js";
import type { CommentRuntime } from "./comment-core.js";
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

const runOnTarget = async <Value>(
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

const inspectAttachments = async (
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

const createCommentReply = (
  runtime: CommentRuntime,
  ref: CommentRef,
  reply: ReplyRequest
): Promise<DesignComment> =>
  runOnTarget(runtime, ref, (projectId, directionId) => {
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

const createCommentThread = async (
  runtime: CommentRuntime,
  ref: CommentRef,
  input: CreateCommentInput
): Promise<DesignComment> => {
  if (input.drawing && (input.attachmentIds?.length ?? 0) === 0) {
    throw new BadRequestError("a drawing needs its image in attachmentIds");
  }

  const { direction, project } = await runtime.loadTarget(
    ref.projectId,
    ref.directionId
  );

  await inspectAttachments(runtime, project.id, input.attachmentIds ?? []);

  return runtime.files.create(project.id, direction.id, input);
};

const createCommentPrefill = async (
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

export {
  createCommentThread,
  createCommentPrefill,
  createCommentReply,
  runOnTarget,
};

export type { CommentRef, ReplyRequest };
