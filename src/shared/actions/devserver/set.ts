import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DevserverConfigSavedSchema } from "./schema.js";

const setDevserver = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Set the url and env of an attached app. An empty url makes the studio start the dev server. The dev server restarts after the change.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/app/config" },
  id: "devserver.set",
  input: Schema.Struct({
    env: Schema.optionalKey(
      Schema.NullOr(Schema.Record(Schema.String, Schema.String))
    ),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  }),
  invalidates: ["devserver.get"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: DevserverConfigSavedSchema,
  scope: "project",
});

export { setDevserver };
