import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageSourceFields, PageSourceImportedSchema } from "./source/schema.js";

const importSourcePage = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_source_page",
    set: "app",
    short:
      "Copy the app route of a route copy page again as a new page and frame. The old page and its edits do not change.",
  },
  confirm: "none",
  description:
    "Copy the app route of a route copy page again, as a new static page <page>-app.html and a new canvas frame. It starts the app dev server when it is off. The old page and its edits do not change, and the old page still shows that the app changed. The new page gets its own copy record in .studio, which undo and restore do not change. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  id: "page.importSource",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageSourceFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["canvas.getDoc", "version.list", "page.inspectSource"],
  mcp: { name: "import_source_page" },
  needs: "project.update",
  output: PageSourceImportedSchema,
  scope: "project",
});

export { importSourcePage };
