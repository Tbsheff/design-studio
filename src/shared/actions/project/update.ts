import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ProjectSchema, SettingsFields } from "./schema.js";

const updateProject = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description: "Update the settings of one project. Returns the project.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/projects/:projectId/settings" },
  id: "project.update",
  input: Schema.Struct({
    ...SettingsFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.get", "project.list"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: ProjectSchema,
  scope: "project",
});

export { updateProject };
