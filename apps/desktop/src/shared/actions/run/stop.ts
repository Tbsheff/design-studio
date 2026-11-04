import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { AckSchema } from "./schema.js";

const stopRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description: "Stop one active run. Fails when the run is not active.",
  errors: [NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/runs/:runId/cancel" },
  id: "run.stop",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["run.get", "run.list"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: AckSchema,
  scope: "project",
});

export { stopRun };
