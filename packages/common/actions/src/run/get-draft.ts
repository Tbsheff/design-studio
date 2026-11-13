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
    "Read the file that a running agent writes or edits now. Returns the file path, the kind (write or edit), the size in bytes of the new text, the partial HTML (cut at 256 KB, null for files that are not HTML) and if the change is complete. For an edit, the HTML is the full page with the partial edit in place, or null when the old text is not found once. Call it next to get_run to show the page before the run ends. Read only.",
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
