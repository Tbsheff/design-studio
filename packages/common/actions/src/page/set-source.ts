import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageSourceFields, PageSourceSetSchema } from "./source/schema.js";

const setSourcePage = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_source_page",
    set: "app",
    short:
      "Mark a route copy page as current with the app, after you apply the app changes. The page file does not change.",
  },
  confirm: "none",
  description:
    "Mark a route prototype page as current with the app. It hashes the app route files again and takes a new copy snapshot, so the page no longer shows App changed. The page file does not change. Call it after you apply the app changes from inspect_source_changes_page to the page. The copy record is in .studio and is not versioned, so undo of the page edits does not bring back App changed.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  id: "page.setSource",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageSourceFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["page.inspectSource", "page.inspectSourceChanges"],
  mcp: { name: "set_source_page" },
  needs: "project.update",
  output: PageSourceSetSchema,
  scope: "project",
});

export { setSourcePage };
