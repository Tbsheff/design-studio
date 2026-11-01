import { z } from "zod";

import { COMMENT_TEXT_MAX } from "../../../shared/comments.js";
import { directionId, id, pagePath, projectId, selector } from "../edit-kit.js";

const COMMENT_ID_TEXT = "Comment id from add_comment.";

const commentText = z.string().trim().min(1).max(COMMENT_TEXT_MAX);

const addCommentSchema = z.strictObject({
  projectId,
  directionId,
  path: pagePath,
  selector: selector
    .optional()
    .describe(
      "CSS selector of the element. Leave out for a comment on the whole frame."
    ),
  text: commentText,
});

const replyCommentSchema = z.strictObject({
  projectId,
  directionId,
  commentId: id(COMMENT_ID_TEXT),
  text: commentText,
});

const resolveCommentSchema = z.strictObject({
  projectId,
  directionId,
  commentId: id(COMMENT_ID_TEXT),
});

type AddCommentInput = z.output<typeof addCommentSchema>;

type ReplyCommentInput = z.output<typeof replyCommentSchema>;

type ResolveCommentInput = z.output<typeof resolveCommentSchema>;

export { addCommentSchema, replyCommentSchema, resolveCommentSchema };

export type { AddCommentInput, ReplyCommentInput, ResolveCommentInput };
