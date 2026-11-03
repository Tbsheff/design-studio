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
import { CommentRemovedSchema } from "./schema.js";

const deleteComment = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Delete one comment and its replies from a direction, from the studio Comments pane. The comment numbers of the other comments do not change.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
  id: "comment.delete",
  input: Schema.Struct({
    commentId: CommentIdSchema,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { off: "ui-bootstrap" },
  needs: "comment.delete",
  output: CommentRemovedSchema,
  scope: "project",
});

export { deleteComment };
