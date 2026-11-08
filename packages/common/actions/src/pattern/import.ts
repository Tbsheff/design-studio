import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PatternImportedSchema, PatternImportFields } from "./schema.js";

const importPattern = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_pattern",
    set: "kit",
    short:
      "Capture one section of a web page as a saved pattern with its styles and a reference image.",
  },
  confirm: "none",
  description:
    "Capture one section of a web page as a saved pattern. The page loads in a headless browser. Computed styles of the subtree become a scoped class sheet, and images and fonts are copied with content hashes. The pattern keeps the URL, a reference PNG and the matched token names. Insert it with insert_pattern. Changes no project file.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "POST", path: "/api/projects/:projectId/patterns/imports" },
  id: "pattern.import",
  input: Schema.Struct({
    ...PatternImportFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["pattern.list"],
  mcp: { name: "import_pattern" },
  needs: "studio.write",
  output: PatternImportedSchema,
  scope: "project",
});

export { importPattern };
