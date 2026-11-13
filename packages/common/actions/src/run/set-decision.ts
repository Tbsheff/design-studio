import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import {
  DecisionIdSchema,
  DecisionPickSchema,
  PickedOptionSchema,
} from "./decision/schema.js";

const setDecisionRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Pick one option of a design choice in a run. On an active run it sends a steer. On a finished run it starts a follow-up run on the same frame. Returns the run id and whether it was a steer.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/runs/:runId/decisions/:decisionId",
  },
  id: "run.setDecision",
  input: Schema.Struct({
    decisionId: DecisionIdSchema,
    option: PickedOptionSchema,
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["run.get", "run.list", "run.listDecisions"],
  mcp: { name: "set_decision_run" },
  needs: "project.update",
  output: DecisionPickSchema,
  scope: "project",
});

export { setDecisionRun };
