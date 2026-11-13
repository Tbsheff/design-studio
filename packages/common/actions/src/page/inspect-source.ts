import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageSourceFields, PageSourceSchema } from "./source/schema.js";

const inspectSourcePage = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_source_page",
    set: "app",
    short:
      "Check if a route copy page is still the same as the app. Use it when the user asks if the prototype is current.",
  },
  confirm: "none",
  description:
    "Check if one page of a route prototype is still the same as the app route it copies. The check reads the route file and its layout files in the app folder and compares their content hashes with the hashes saved at copy time. A page that is not a route copy gives isRouteCopy false. The copy record is in .studio, so undo and restore do not change it. Use it when the user asks if the prototype is current.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  id: "page.inspectSource",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageSourceFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_source_page" },
  needs: "project.read",
  output: PageSourceSchema,
  scope: "project",
});

export { inspectSourcePage };
