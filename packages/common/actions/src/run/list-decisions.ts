import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DecisionSchema } from "./decision/schema.js";

const listDecisionsRun = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the design choices that the agent recorded in one run, with the options and the option the user picked. Read only.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/runs/:runId/decisions",
  },
  id: "run.listDecisions",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: pageOf(DecisionSchema),
  scope: "project",
});

export { listDecisionsRun };
