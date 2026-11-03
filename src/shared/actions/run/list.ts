import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { RunPageSchema } from "./schema.js";

const listRun = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the runs of one project, newest first, with paging and an optional search text. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/runs" },
  id: "run.list",
  input: Schema.Struct({
    before: Schema.optionalKey(Schema.Number),
    direction: Schema.optionalKey(Schema.String),
    light: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(Schema.Number),
    projectId: ProjectIdSchema,
    q: Schema.optionalKey(Schema.String),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: RunPageSchema,
  scope: "project",
});

export { listRun };
