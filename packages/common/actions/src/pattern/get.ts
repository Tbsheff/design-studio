import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PatternGetSchema, PatternIdFields } from "./schema.js";

const getPattern = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_pattern",
    set: "kit",
    short: "Get the source, imports and token names of one saved pattern.",
  },
  confirm: "none",
  description:
    "Get one saved pattern: its source, imports, token names and free names. Read it to see what insert_pattern would place.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/pattern/:patternId" },
  id: "pattern.get",
  input: Schema.Struct({
    ...PatternIdFields,
  }),
  invalidates: [],
  mcp: { name: "get_pattern" },
  needs: "studio.read",
  output: PatternGetSchema,
  scope: "device",
});

export { getPattern };
