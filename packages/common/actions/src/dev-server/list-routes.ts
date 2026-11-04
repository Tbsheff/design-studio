import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DevServerRoutesSchema } from "./schema.js";

const listRoutesDevServer = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the page routes of an attached app, read from the app router page files under the app dir.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/app/routes" },
  id: "dev-server.listRoutes",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: DevServerRoutesSchema,
  scope: "project",
});

export { listRoutesDevServer };
