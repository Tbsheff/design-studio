import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { RunStartedSchema } from "./schema.js";

const Loose = Schema.optionalKey(Schema.Json);

const startRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Start one run in a direction of a project. Returns the run id. Fails when a run is already active.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/runs",
  },
  id: "run.start",
  input: Schema.Struct({
    attachmentIds: Loose,
    canvas: Loose,
    commentIds: Loose,
    directionId: DirectionIdSchema,
    editScope: Loose,
    effort: Loose,
    lean: Loose,
    level: Loose,
    mentions: Loose,
    mode: Loose,
    plan: Loose,
    projectId: ProjectIdSchema,
    prompt: Schema.String,
    referenceUrls: Loose,
    retryOf: Loose,
    selection: Loose,
    states: Loose,
    task: Loose,
  }),
  invalidates: ["run.list"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: RunStartedSchema,
  scope: "project",
});

export { startRun };
