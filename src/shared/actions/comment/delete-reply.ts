import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  CommentIdSchema,
  DirectionIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { CommentSchema, SafeIdTextSchema } from "./schema.js";

const deleteReplyComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Delete one reply from a pinned comment, from the studio Comments pane. The comment and its other replies stay.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId/replies/:replyId",
  },
  id: "comment.deleteReply",
  input: Schema.Struct({
    commentId: CommentIdSchema,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    replyId: SafeIdTextSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { off: "legacy-mcp" },
  needs: "comment.delete",
  output: CommentSchema,
  scope: "project",
});

export { deleteReplyComment };
