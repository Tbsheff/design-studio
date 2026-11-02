import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { RunInProgress } from "./errors/run-in-progress.js";
import {
  CommentSchema,
  RunLevelSchema,
  SelectionContextsSchema,
  SendIdsSchema,
} from "./schema.js";

const startComments = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Send the queued comments of a direction, or the chosen comments, to the agent as one edit run. The comments become sent. When a run is active, the comments stay queued and the action fails.",
  errors: [BadRequest, Conflict, NotFound, RunInProgress],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/send",
  },
  id: "comments.start",
  input: Schema.Struct({
    contexts: Schema.optionalKey(SelectionContextsSchema),
    directionId: DirectionIdSchema,
    ids: Schema.optionalKey(SendIdsSchema),
    level: Schema.optionalKey(RunLevelSchema),
    projectId: ProjectIdSchema,
  }),
  invalidates: ["comments.list"],
  mcp: { off: "run-control" },
  needs: "comment.write",
  output: Schema.Struct({
    comments: Schema.Array(CommentSchema),
    runId: Schema.String,
  }),
  scope: "project",
});

export { startComments };
