import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ScreenDuplicateFields,
  ScreenDuplicatedSchema,
  ScreenProjectFields,
} from "./schema.js";

const duplicateScreen = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "duplicate_screen",
    set: "app",
    short:
      "Copy an app screen to a new route: page, loading, error and local components, with imports kept valid.",
  },
  confirm: "none",
  description:
    "Copy an existing route page and its route-local files (loading, error and local component folders) into a new route path. Relative imports are rewritten so they still resolve. Dynamic segments keep their saved sample params. In an HTML project it copies the page file. Adds a canvas frame to the right of the source frame and saves one version. Fails if the new path exists.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/screens/duplicates" },
  id: "screen.duplicate",
  input: Schema.Struct({
    ...ScreenProjectFields,
    ...ScreenDuplicateFields,
  }),
  invalidates: ["canvas.getDoc", "version.list", "workspace.listRoutes"],
  mcp: { name: "duplicate_screen" },
  needs: "project.update",
  output: ScreenDuplicatedSchema,
  scope: "project",
});

export { duplicateScreen };
