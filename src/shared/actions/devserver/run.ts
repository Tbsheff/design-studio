import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { AppServerStatusSchema } from "./schema.js";

const runDevserver = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Restart the dev server of an attached app. The server restarts in the background. Read its status with devserver.get.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/app/restart" },
  id: "devserver.run",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["devserver.get"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: AppServerStatusSchema,
  scope: "project",
});

export { runDevserver };
