import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { AckSchema, TextSchema } from "./schema.js";

const setSteerRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Send a steer message to one active run. Fails when the run has finished.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/runs/:runId/steer" },
  id: "run.setSteer",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
    text: TextSchema,
  }),
  invalidates: ["run.get"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: AckSchema,
  scope: "project",
});

export { setSteerRun };
