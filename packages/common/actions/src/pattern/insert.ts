import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PatternInsertedSchema,
  PatternInsertFields,
  PatternProjectFields,
} from "./schema.js";

const insertPattern = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "insert_pattern",
    set: "kit",
    short:
      "Insert a saved pattern at a layer or as a new page. Lists each import or token that did not map.",
  },
  confirm: "none",
  description:
    "Insert a saved pattern at a target layer, or as a new page, in one version. In another project it maps imports to the components of that project and token names to the nearest value. It lists each import and token that did not map.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pattern/insert",
  },
  id: "pattern.insert",
  input: Schema.Struct({
    ...PatternProjectFields,
    ...PatternInsertFields,
  }),
  invalidates: ["direct-edit.getTree", "version.list"],
  mcp: { name: "insert_pattern" },
  needs: "project.update",
  output: PatternInsertedSchema,
  scope: "project",
});

export { insertPattern };
