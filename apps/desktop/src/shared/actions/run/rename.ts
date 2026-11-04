import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { RunSummarySchema } from "./schema.js";

const renameRun = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Set or clear the title of one finished run. Returns the run summary. Fails while the run is active.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/projects/:projectId/runs/:runId" },
  id: "run.rename",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
    title: Schema.String,
  }),
  invalidates: ["run.get", "run.list"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: RunSummarySchema,
  scope: "project",
});

export { renameRun };
