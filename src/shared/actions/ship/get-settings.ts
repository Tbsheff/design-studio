import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ShipSettingsSchema } from "./schema.js";

const getSettingsShip = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the ship settings of a project: git user name, branch template, pull request body template and issue id.",
  errors: [NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/ship/settings" },
  id: "ship.getSettings",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ShipSettingsSchema,
  scope: "project",
});

export { getSettingsShip };
