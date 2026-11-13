import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageSourceChangesSchema, PageSourceFields } from "./source/schema.js";

const inspectSourceChangesPage = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_source_changes_page",
    set: "tweak",
    short:
      "Show line diffs of the app route files since a route copy page was made. Use it to apply app changes to an edited page.",
  },
  confirm: "none",
  description:
    'Show the app changes since a route prototype page was copied. For each route file and layout file that changed, it gives a line diff from the copy snapshot to the app file now: "+" lines are new, "-" lines are old. Use it before you apply app changes to an edited page: keep the page edits, apply only the app changes, then call set_source_page. A page copied before snapshots gives hasSnapshot false and empty diffs; then use import_source_page and compare the two pages. No git and no dev server.',
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/source/changes",
  },
  id: "page.inspectSourceChanges",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageSourceFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_source_changes_page" },
  needs: "project.read",
  output: PageSourceChangesSchema,
  scope: "project",
});

export { inspectSourceChangesPage };
