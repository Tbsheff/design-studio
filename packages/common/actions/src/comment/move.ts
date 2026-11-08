import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { CommentOrderSchema, ReorderIdsSchema } from "./schema.js";

const moveComment = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "move_comment",
    set: "core",
    short:
      "Set the order of the comments in a direction. Give the comment ids in the new order; ids left out keep their place.",
  },
  confirm: "none",
  description:
    "Set the order of the comments in a direction, from the studio Comments pane. Give the comment ids in the new order; ids that you leave out keep their place.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/reorder",
  },
  id: "comment.move",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ids: ReorderIdsSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["comment.list"],
  mcp: { name: "move_comment" },
  needs: "comment.write",
  output: CommentOrderSchema,
  scope: "project",
});

export { moveComment };
