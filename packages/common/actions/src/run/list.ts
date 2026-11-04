import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { RunSummarySchema } from "./schema.js";

const listRun = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the runs of one project, newest first, with paging, an optional direction and an optional search text. light drops the long fields. Read only.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/runs" },
  id: "run.list",
  input: Schema.Struct({
    ...PageFields,
    direction: Schema.optionalKey(DirectionIdSchema),
    light: Schema.optionalKey(Schema.Boolean),
    projectId: ProjectIdSchema,
    q: Schema.optionalKey(Schema.String),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: pageOf(RunSummarySchema),
  scope: "project",
});

export { listRun };
