import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PropChangeSchema, PropTargetFields } from "./schema.js";

const deleteProp = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_prop",
    set: "core",
    short:
      "Delete a component prop and remove it from every use site that sets it.",
  },
  confirm: "user",
  description:
    "Delete one prop of a React component from its type and body, and remove it from every use site that sets it. The card lists the use sites that change. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/prop",
  },
  id: "prop.delete",
  input: Schema.Struct({
    ...PropTargetFields,
    name: Schema.String,
  }),
  invalidates: ["prop.list"],
  mcp: { name: "delete_prop" },
  needs: "project.update",
  output: PropChangeSchema,
  scope: "project",
});

export { deleteProp };
