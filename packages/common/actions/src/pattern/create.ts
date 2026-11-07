import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PatternCreateFields,
  PatternDetailSchema,
  PatternProjectFields,
} from "./schema.js";

const createPattern = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_pattern",
    set: "kit",
    short:
      "Save one layer of the page as a reusable pattern with its source, imports and token names.",
  },
  confirm: "none",
  description:
    "Save one layer as a pattern: its source, imports and token names. Patterns live in the studio, so any project can insert them. Changes no project file.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pattern",
  },
  id: "pattern.create",
  input: Schema.Struct({
    ...PatternProjectFields,
    ...PatternCreateFields,
  }),
  invalidates: ["pattern.list"],
  mcp: { name: "create_pattern" },
  needs: "studio.write",
  output: PatternDetailSchema,
  scope: "project",
});

export { createPattern };
