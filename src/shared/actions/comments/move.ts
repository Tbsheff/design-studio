import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { CommentOrderSchema, ReorderIdsSchema } from "./schema.js";

const moveComments = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Set the order of the comments in a direction, from the studio Comments pane. Give the comment ids in the new order; ids that you leave out keep their place.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/reorder",
  },
  id: "comments.move",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ids: ReorderIdsSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["comments.list"],
  mcp: { off: "ui-bootstrap" },
  needs: "comment.write",
  output: CommentOrderSchema,
  scope: "project",
});

export { moveComments };
