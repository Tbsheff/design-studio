import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  CommentFieldSchema,
  CommentResolvedSchema,
  DirectionFieldSchema,
  ProjectFieldSchema,
} from "./schema.js";

const setResolvedComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Mark a pinned comment as resolved. Use the comment id from list_comments or add_comment. A resolved comment stays in the list with status all or resolved.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/comments/:commentId/resolved",
  },
  id: "comment.setResolved",
  input: Schema.Struct({
    commentId: CommentFieldSchema,
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { name: "resolve_comment" },
  needs: "comment.resolve",
  output: CommentResolvedSchema,
  scope: "project",
});

export { setResolvedComment };
