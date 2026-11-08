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
import {
  CommentSchema,
  CommentStatusSchema,
  CommentTextSchema,
  SelectionContextSchema,
  TargetInputSchema,
} from "./schema.js";

const updateComment = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_comment",
    set: "core",
    short:
      "Change the text, status, target or element of one comment in a direction. A status change follows the comment status rules.",
  },
  confirm: "none",
  description:
    "Change the text, status, target or element of one comment in a direction, from the studio Comments pane. A status change follows the comment status rules.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PATCH",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
  id: "comment.update",
  input: Schema.Struct({
    commentId: CommentIdSchema,
    context: Schema.optionalKey(SelectionContextSchema),
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    status: Schema.optionalKey(CommentStatusSchema),
    target: Schema.optionalKey(TargetInputSchema),
    text: Schema.optionalKey(CommentTextSchema),
  }),
  invalidates: ["comment.list"],
  mcp: { name: "update_comment" },
  needs: "comment.write",
  output: CommentSchema,
  scope: "project",
});

export { updateComment };
