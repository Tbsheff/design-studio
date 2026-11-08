import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ScreenCreateFields,
  ScreenCreatedSchema,
  ScreenProjectFields,
} from "./schema.js";

const createScreen = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_screen",
    set: "app",
    short:
      "Start a new app screen from a layout group: writes the page file with the group shell and adds a canvas frame.",
  },
  confirm: "none",
  description:
    "Write a new page file for a route path in a chosen layout group of the attached app. The page copies the heading pattern and imports of a sample route in that group and gets a body skeleton for the layout: blank, list, detail or form. Adds a canvas frame for the route and saves one version that undo takes back. Fails if the path exists. Use inspect_screen to pick the group.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/screens" },
  id: "screen.create",
  input: Schema.Struct({
    ...ScreenProjectFields,
    ...ScreenCreateFields,
  }),
  invalidates: ["canvas.getDoc", "version.list", "workspace.listRoutes"],
  mcp: { name: "create_screen" },
  needs: "project.update",
  output: ScreenCreatedSchema,
  scope: "project",
});

export { createScreen };
