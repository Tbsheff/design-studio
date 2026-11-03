import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields } from "../_core/list-page.js";
import { RepoContextSchema } from "./schema.js";

const getContextRun = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the repo context that a run of one direction gets. Returns at most limit files. Read only.",
  errors: [NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/run-context",
  },
  id: "run.getContext",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    limit: PageFields.limit,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: RepoContextSchema,
  scope: "project",
});

export { getContextRun };
