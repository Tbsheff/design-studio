import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PageImportedSchema,
  PageImportFields,
  PageImportTargetFields,
} from "./schema.js";

const importPage = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_page",
    set: "core",
    short:
      "Copy a live page (https or localhost URL) into a new static HTML page and canvas frame: a copy for redesign, not a live link.",
  },
  confirm: "none",
  description:
    "Copy a live web page into this HTML project as a new static page and canvas frame. The page loads in a headless browser at the viewport width. Its computed styles become a small class stylesheet, and images and fonts are copied into the project. One version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/import-page",
  },
  id: "page.import",
  input: Schema.Struct({
    ...PageImportTargetFields,
    ...PageImportFields,
  }),
  invalidates: ["canvas.getDoc"],
  mcp: { name: "import_page" },
  needs: "project.update",
  output: PageImportedSchema,
  scope: "project",
});

export { importPage };
