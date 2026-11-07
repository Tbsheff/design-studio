import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PatternListFields, PatternSchema } from "./schema.js";

const listPattern = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_pattern",
    set: "kit",
    short:
      "List saved page patterns by name or tag before you write a new screen from scratch.",
  },
  confirm: "none",
  description:
    "List the saved page patterns with name, tags, kind and counts. Filter with a text query or one tag. A pattern is a saved composition of real components that any project can insert.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/pattern" },
  id: "pattern.list",
  input: Schema.Struct({
    ...PageFields,
    ...PatternListFields,
  }),
  invalidates: [],
  mcp: { name: "list_pattern" },
  needs: "studio.read",
  output: pageOf(PatternSchema),
  scope: "device",
});

export { listPattern };
