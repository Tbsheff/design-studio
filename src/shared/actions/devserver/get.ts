import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DevserverViewSchema } from "./schema.js";

const getDevserver = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the dev server of an attached app: its status, recent logs, the attached app settings and the first version state.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/app" },
  id: "devserver.get",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: DevserverViewSchema,
  scope: "project",
});

export { getDevserver };
