import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DevServerConfigSavedSchema } from "./schema.js";

const setDevServer = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_dev_server",
    set: "app",
    short:
      "Set the url and env of the attached app. An empty url makes the studio start the dev server. The dev server restarts.",
  },
  confirm: "none",
  description:
    "Set the url and env of an attached app. An empty url makes the studio start the dev server. The dev server restarts after the change.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/app/config" },
  id: "dev-server.set",
  input: Schema.Struct({
    env: Schema.optionalKey(
      Schema.NullOr(Schema.Record(Schema.String, Schema.String))
    ),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  }),
  invalidates: ["dev-server.get"],
  mcp: { name: "set_dev_server" },
  needs: "project.update",
  output: DevServerConfigSavedSchema,
  scope: "project",
});

export { setDevServer };
