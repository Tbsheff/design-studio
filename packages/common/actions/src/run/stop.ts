import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { AckSchema } from "./schema.js";

const stopRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Stop one active run. When the run is part of a state sequence from start_states_run, it also drops the states that wait. Fails when the run is not active and is not part of a sequence.",
  errors: [NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/runs/:runId/cancel" },
  id: "run.stop",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["run.get", "run.list"],
  mcp: { name: "stop_run" },
  needs: "project.update",
  output: AckSchema,
  scope: "project",
});

export { stopRun };
