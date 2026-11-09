import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  ContentLayerSchema,
  ContentResultSchema,
  ImportColumnsSchema,
  ImportTextSchema,
} from "./schema.js";

const importContent = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_content",
    set: "core",
    short:
      "Fill a list or table body from pasted CSV, TSV or JSON rows. One undoable version.",
  },
  confirm: "none",
  description:
    "Paste CSV, TSV or a JSON array onto a list or table body layer. The first row is cloned to the row count and each cell fills the text slots of its row in source order, or by a columns map. Max 200 rows and 100 KB. Saved as one version that undo takes back.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/content/import",
  },
  id: "content.import",
  input: Schema.Struct({
    columns: ImportColumnsSchema,
    directionId: DirectionIdSchema,
    layer: ContentLayerSchema,
    projectId: ProjectIdSchema,
    text: ImportTextSchema,
  }),
  invalidates: ["version.list", "version.get"],
  mcp: { name: "import_content" },
  needs: "studio.write",
  output: ContentResultSchema,
  scope: "project",
});

export { importContent };
