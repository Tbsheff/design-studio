import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import {
  LayoutGroupSchema,
  ScreenPathSchema,
  ScreenProjectFields,
} from "./schema.js";

const inspectScreen = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_screen",
    set: "app",
    short:
      "Plan a new app screen: is the path free, which layout groups exist, and what shell each group uses.",
  },
  confirm: "none",
  description:
    "Plan a new app screen for a route path. Return whether the path is free, the page file it would use, and the layout groups of the app with their layout file, shell components, sample routes and auth state. Read only. Call it before create_screen to pick a group.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/screens/plan" },
  id: "screen.inspect",
  input: Schema.Struct({
    ...PageFields,
    ...ScreenProjectFields,
    path: ScreenPathSchema.annotate({
      description: "The planned route path, for example /patients/intake.",
    }),
  }),
  invalidates: [],
  mcp: { name: "inspect_screen" },
  needs: "project.read",
  output: Schema.Struct({
    filePath: Schema.String,
    groups: pageOf(LayoutGroupSchema),
    isPathFree: Schema.Boolean,
  }),
  scope: "project",
});

export { inspectScreen };
