import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PatternDeletedSchema, PatternIdFields } from "./schema.js";

const deletePattern = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_pattern",
    set: "kit",
    short: "Delete one saved page pattern after the user approves.",
  },
  confirm: "user",
  description:
    "Delete one saved pattern from the studio. The approval card shows its name. Projects that used the pattern keep their code.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/pattern/:patternId" },
  id: "pattern.delete",
  input: Schema.Struct({
    ...PatternIdFields,
  }),
  invalidates: ["pattern.list", "pattern.get"],
  mcp: { name: "delete_pattern" },
  needs: "studio.write",
  output: PatternDeletedSchema,
  scope: "device",
});

export { deletePattern };
