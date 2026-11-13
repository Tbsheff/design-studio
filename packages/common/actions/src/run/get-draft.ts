import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, RunIdSchema } from "../_core/ids.js";
import { RunDraftSchema } from "./draft/schema.js";

const getDraftRun = defineAction({
  access: "read",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Read the file that a running agent writes now. Returns the file path, its size in bytes, the partial HTML (cut at 256 KB, null for files that are not HTML) and if the write is complete. Call it next to get_run to show the page before the run ends. Read only.",
  errors: [NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/runs/:runId/draft" },
  id: "run.getDraft",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_draft_run" },
  needs: "project.read",
  output: RunDraftSchema,
  scope: "project",
});

export { getDraftRun };
