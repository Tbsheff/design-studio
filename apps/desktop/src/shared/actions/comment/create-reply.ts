import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  AuthorSchema,
  CommentFieldSchema,
  CommentRepliedSchema,
  CommentTextSchema,
  DirectionFieldSchema,
  ProjectFieldSchema,
} from "./schema.js";

const createReplyComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Add a reply to a pinned comment. The reply shows the author name, or your client name when you give it.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/comments/:commentId/replies",
  },
  id: "comment.createReply",
  input: Schema.Struct({
    author: Schema.optionalKey(AuthorSchema),
    commentId: CommentFieldSchema,
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
    text: CommentTextSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { name: "reply_comment" },
  needs: "comment.write",
  output: CommentRepliedSchema,
  scope: "project",
});

export { createReplyComment };
