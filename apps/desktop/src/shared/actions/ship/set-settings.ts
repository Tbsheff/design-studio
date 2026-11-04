import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ShipSettingsSchema } from "./schema.js";

const setSettingsShip = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Save the ship settings of a project: git user name, branch template, pull request body template and issue id.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/ship/settings" },
  id: "ship.setSettings",
  input: Schema.Struct({
    ...ShipSettingsSchema.fields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["ship.getSettings", "ship.getPlan"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: ShipSettingsSchema,
  scope: "project",
});

export { setSettingsShip };
