import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { AppServerStatusSchema } from "./schema.js";

const startDevServer = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Start the dev server of an attached app. The server starts in the background. Read its status with devserver.get.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/app/start" },
  id: "dev-server.start",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["dev-server.get"],
  mcp: { off: "run-control" },
  needs: "project.update",
  output: AppServerStatusSchema,
  scope: "project",
});

export { startDevServer };
