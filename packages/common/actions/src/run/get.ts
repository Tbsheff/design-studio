import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { RunDetailSchema } from "./schema.js";

const getRun = defineAction({
  access: "read",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Read one run by id. Returns its status, events, the messages sent to it and its summary. Call it after start_run until the status is no longer running. Read only.",
  errors: [NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/runs/:runId" },
  id: "run.get",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_run" },
  needs: "project.read",
  output: RunDetailSchema,
  scope: "project",
});

export { getRun };
