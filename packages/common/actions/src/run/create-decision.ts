import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import {
  DecisionDirectionSchema,
  DecisionOptionSchema,
  DecisionOptionsSchema,
  DecisionSchema,
  DecisionTopicSchema,
} from "./decision/schema.js";

const createDecisionRun = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_decision_run",
    set: "core",
    short:
      "Record one design choice you made, with 2 to 4 options, so the user can change it in one click.",
  },
  confirm: "none",
  description:
    "Record one design choice that the agent made in a run, with 2 to 4 options, so the user can change it in one click. Pass runId current with a directionId to use the active run of that direction. A second call with the same topic updates the choice.",
  errors: [BadRequest, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/decisions",
  },
  id: "run.createDecision",
  input: Schema.Struct({
    chosen: DecisionOptionSchema,
    directionId: DecisionDirectionSchema,
    options: DecisionOptionsSchema,
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
    topic: DecisionTopicSchema,
  }),
  invalidates: ["run.get", "run.listDecisions"],
  mcp: { name: "create_decision_run" },
  needs: "project.update",
  output: DecisionSchema,
  scope: "project",
});

export { createDecisionRun };
